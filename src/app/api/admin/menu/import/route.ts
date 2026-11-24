import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseImportRow } from "@/components/admin/menu-import";
import { fail, guard, list, readBody } from "../../_util";

export const POST = guard(async (req: Request) => {
  const raws = list(await readBody(req), "rows", "Rows", 1000);
  const parsed = raws.map((r) => parseImportRow(r));
  const bad = parsed.flatMap((p, i) => ("errors" in p ? [{ row: i + 1, errors: p.errors }] : []));
  if (bad.length) return NextResponse.json({ error: "Some rows are invalid", rows: bad }, { status: 400 });
  const rows = parsed.map((p) => ("row" in p ? p.row : null)!);
  if (!rows.length) return fail("No rows to import");

  const result = await db.$transaction(
    async (tx) => {
      const cats = new Map<string, string>(); // name -> id
      let nextSort = ((await tx.category.aggregate({ _max: { sortOrder: true } }))._max.sortOrder ?? 0) + 1;
      let categoriesCreated = 0;
      let created = 0;
      let updated = 0;
      for (const r of rows) {
        let catId = cats.get(r.category);
        if (!catId) {
          const found = await tx.category.findFirst({ where: { name: r.category } });
          const cat = found ?? (await tx.category.create({ data: { name: r.category, kind: r.kind, sortOrder: nextSort++ } }));
          if (!found) categoriesCreated++;
          catId = cat.id;
          cats.set(r.category, catId);
        }
        const fields = { description: r.description, station: r.station, basePrice: r.basePrice };
        const existing = await tx.menuItem.findFirst({ where: { categoryId: catId, name: r.name } });
        const itemId = existing
          ? (await tx.menuItem.update({ where: { id: existing.id }, data: fields })).id
          : (await tx.menuItem.create({ data: { ...fields, name: r.name, categoryId: catId } })).id;
        if (existing) updated++;
        else created++;
        await tx.variant.deleteMany({ where: { itemId } });
        if (r.variants.length) await tx.variant.createMany({ data: r.variants.map((v) => ({ ...v, itemId })) });
      }
      return { categoriesCreated, created, updated };
    },
    { timeout: 30_000 },
  );
  return NextResponse.json(result);
});

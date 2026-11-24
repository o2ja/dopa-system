import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const jd = (n: number) => Math.round(n * 1000);

async function main() {
  await db.printJob.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.shift.deleteMany();
  await db.branchItemAvailability.deleteMany();
  await db.variant.deleteMany();
  await db.menuItem.deleteMany();
  await db.modifier.deleteMany();
  await db.modifierGroup.deleteMany();
  await db.category.deleteMany();
  await db.branch.deleteMany();

  const [b1] = await Promise.all([
    db.branch.create({
      data: {
        slug: "branch-1", nameAr: "دوبا — جبل عمّان", nameEn: "Dopa · Jabal Amman",
        addressAr: "شارع الرينبو، جبل عمّان", phone: "0790000001", hours: "08:00-24:00",
        cliqAlias: "DOPAJA", cliqName: "Dopa Cafe House LLC",
        coffeePrinterIp: "192.168.1.101", kitchenPrinterIp: "192.168.1.102", cashierPrinterIp: "192.168.1.103",
      },
    }),
    db.branch.create({
      data: {
        slug: "branch-2", nameAr: "دوبا — الجامعة", nameEn: "Dopa · University St.",
        addressAr: "شارع الجامعة الأردنية، مقابل البوابة الرئيسية", phone: "0790000002", hours: "07:00-01:00",
        cliqAlias: "DOPAUNI", cliqName: "Dopa Cafe House LLC", tableCount: 16,
        coffeePrinterIp: "192.168.2.101", kitchenPrinterIp: "192.168.2.102", cashierPrinterIp: "192.168.2.103",
      },
    }),
  ]);

  const group = (nameAr: string, nameEn: string, minSelect: number, maxSelect: number, mods: [string, string, number][]) =>
    db.modifierGroup.create({
      data: { nameAr, nameEn, minSelect, maxSelect, modifiers: { create: mods.map(([nameAr, nameEn, p]) => ({ nameAr, nameEn, price: jd(p) })) } },
    });

  const milk = await group("نوع الحليب", "Milk", 0, 1, [["حليب كامل الدسم", "Whole", 0], ["حليب الشوفان", "Oat", 0.5], ["حليب اللوز", "Almond", 0.5], ["خالي اللاكتوز", "Lactose-free", 0.35]]);
  const sugar = await group("السكر", "Sugar", 0, 1, [["بدون سكر", "No sugar", 0], ["سكر خفيف", "Light", 0], ["سكر وسط", "Medium", 0], ["سكر زيادة", "Extra", 0]]);
  const shot = await group("إضافات القهوة", "Coffee extras", 0, 3, [["شوت إسبريسو إضافي", "Extra shot", 0.5], ["سيروب فانيلا", "Vanilla syrup", 0.35], ["سيروب كراميل", "Caramel syrup", 0.35], ["ديكاف", "Decaf", 0]]);
  const burgerX = await group("تعديلات", "Adjustments", 0, 4, [["بدون بصل", "No onions", 0], ["بدون مخلل", "No pickles", 0], ["جبنة إضافية", "Extra cheese", 0.5], ["لحم إضافي", "Extra patty", 1.75]]);
  const sauces = await group("الصوصات", "Sauces", 0, 2, [["صوص دوبا الخاص", "Dopa sauce", 0], ["ثومية", "Garlic", 0], ["باربكيو", "BBQ", 0], ["هالبينو حار", "Spicy jalapeño", 0.25]]);
  const crust = await group("العجينة", "Crust", 1, 1, [["رقيقة", "Thin", 0], ["إيطالية سميكة", "Thick", 0.5]]);

  const cat = (nameAr: string, nameEn: string, kind: string, sortOrder: number) => db.category.create({ data: { nameAr, nameEn, kind, sortOrder } });
  const hot = await cat("القهوة الساخنة", "Hot Coffee", "coffee", 1);
  const cold = await cat("المشروبات الباردة", "Cold Drinks", "coffee", 2);
  const sweets = await cat("الحلويات", "Sweets", "coffee", 3);
  const breakfast = await cat("الفطور", "Breakfast", "restaurant", 4);
  const pizza = await cat("البيتزا", "Pizza", "restaurant", 5);
  const burgers = await cat("البرغر والساندويش", "Burgers & Sandwiches", "restaurant", 6);
  const pasta = await cat("الباستا والسلطات", "Pasta & Salads", "restaurant", 7);

  type V = [string, string, number];
  const SML = (s: number, m: number, l: number): V[] => [["صغير", "S", s], ["وسط", "M", m], ["كبير", "L", l]];
  const MEAL = (r: number, m: number): V[] => [["عادي", "Regular", r], ["وجبة (بطاطا + مشروب)", "Meal", m]];

  let order = 0;
  const item = async (
    categoryId: string, nameAr: string, nameEn: string, descAr: string, station: "coffee" | "kitchen",
    price: number, opts: { variants?: V[]; groups?: { id: string }[]; popular?: boolean } = {},
  ) =>
    db.menuItem.create({
      data: {
        categoryId, nameAr, nameEn, descAr, station, basePrice: jd(price), isPopular: !!opts.popular, sortOrder: order++,
        variants: opts.variants && { create: opts.variants.map(([nameAr, nameEn, p], i) => ({ nameAr, nameEn, price: jd(p), sortOrder: i, isDefault: i === (opts.variants!.length === 3 ? 1 : 0) })) },
        modifierGroups: opts.groups && { connect: opts.groups.map((g) => ({ id: g.id })) },
      },
    });

  const coffeeMods = [milk, sugar, shot];
  await item(hot.id, "إسبريسو", "Espresso", "شوت مزدوج من محمصتنا، حبوب إثيوبية وبرازيلية", "coffee", 1.5, { groups: [sugar, shot] });
  await item(hot.id, "سبانش لاتيه", "Spanish Latte", "إسبريسو مع حليب مكثّف محلّى وحليب مبخّر", "coffee", 2.75, { variants: SML(2.5, 2.75, 3.25), groups: coffeeMods, popular: true });
  await item(hot.id, "كابتشينو", "Cappuccino", "رغوة كثيفة ناعمة فوق إسبريسو مزدوج", "coffee", 2.5, { variants: SML(2.25, 2.5, 3), groups: coffeeMods });
  await item(hot.id, "فلات وايت", "Flat White", "حليب مخملي رقيق وطعم قهوة واضح", "coffee", 2.75, { groups: coffeeMods });
  await item(hot.id, "قهوة عربية", "Arabic Coffee", "دلّة بالهيل، تكفي شخصين", "coffee", 2, { groups: [sugar] });
  await item(hot.id, "V60 مقطّرة", "V60 Pour Over", "محصول اليوم، يُحضّر بالتقطير اليدوي", "coffee", 3.5);
  await item(cold.id, "آيس لاتيه", "Iced Latte", "إسبريسو وحليب بارد على الثلج", "coffee", 2.75, { variants: SML(2.5, 2.75, 3.25), groups: coffeeMods, popular: true });
  await item(cold.id, "آيس سبانش لاتيه", "Iced Spanish Latte", "النسخة الباردة من الأكثر طلباً", "coffee", 3, { variants: SML(2.75, 3, 3.5), groups: coffeeMods });
  await item(cold.id, "كولد برو", "Cold Brew", "منقوع 18 ساعة، ناعم وقليل الحموضة", "coffee", 3, { groups: [sugar] });
  await item(cold.id, "ليموناضة بالنعناع", "Mint Lemonade", "ليمون طازج ونعناع، مثلّجة", "coffee", 2.25, { variants: SML(2, 2.25, 2.75), groups: [sugar] });
  await item(sweets.id, "تشيز كيك سان سباستيان", "San Sebastian Cheesecake", "محروقة من الأعلى، كريمية من الداخل", "coffee", 3.5, { popular: true });
  await item(sweets.id, "كرواسون زبدة", "Butter Croissant", "يُخبز كل صباح", "coffee", 1.5);
  await item(breakfast.id, "شكشوكة", "Shakshuka", "بيض في صلصة طماطم وفلفل، مع خبز طابون", "kitchen", 3.5);
  await item(breakfast.id, "طبق الفطور العمّاني", "Ammani Breakfast", "حمص، فول، فلافل، لبنة، زيت وزعتر وشاي", "kitchen", 6.5, { popular: true });
  await item(pizza.id, "بيتزا مارغريتا", "Margherita Pizza", "طماطم سان مارزانو، موزاريلا، ريحان", "kitchen", 5.5, { variants: SML(4.5, 5.5, 7), groups: [crust], popular: true });
  await item(pizza.id, "بيتزا بيبروني", "Pepperoni Pizza", "بيبروني بقري وموزاريلا", "kitchen", 6.5, { variants: SML(5.5, 6.5, 8), groups: [crust] });
  await item(burgers.id, "برغر دوبا الكلاسيكي", "Dopa Classic Burger", "لحم بقري 180غ، شيدر، صوص دوبا", "kitchen", 5.5, { variants: MEAL(5.5, 7.5), groups: [burgerX, sauces], popular: true });
  await item(burgers.id, "تشيكن كرسبي", "Crispy Chicken", "صدر دجاج مقرمش، كول سلو، مخلل", "kitchen", 4.75, { variants: MEAL(4.75, 6.75), groups: [burgerX, sauces] });
  await item(burgers.id, "حلومي ساندويش", "Halloumi Sandwich", "حلومي مشوي، بندورة، جرجير، بيستو", "kitchen", 3.75, { variants: MEAL(3.75, 5.75), groups: [sauces] });
  await item(pasta.id, "ألفريدو دجاج", "Chicken Alfredo", "فيتوتشيني بصوص الكريمة والبارميزان", "kitchen", 6);
  await item(pasta.id, "سلطة سيزر", "Caesar Salad", "خس روماني، خبز محمّص، بارميزان", "kitchen", 4.25);
  await item(pasta.id, "بطاطا مقلية", "Fries", "مقرمشة مع صوص من اختيارك", "kitchen", 1.75, { groups: [sauces] });

  // A taste of Quick 86: cold brew sold out at branch 1 today.
  const coldBrew = await db.menuItem.findFirstOrThrow({ where: { nameEn: "Cold Brew" } });
  await db.branchItemAvailability.create({ data: { branchId: b1.id, itemId: coldBrew.id, isAvailable: false } });

  console.log(`Seeded 2 branches, 7 categories, ${await db.menuItem.count()} items.`);
}

main().finally(() => db.$disconnect());

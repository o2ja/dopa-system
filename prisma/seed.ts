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
        slug: "branch-1", name: "Dopa · Jabal Amman", address: "Rainbow Street, Jabal Amman",
        phone: "0790000001", hours: "08:00-24:00", cliqAlias: "DOPAJA", cliqName: "Dopa Cafe House LLC",
        coffeePrinterIp: "192.168.1.101", kitchenPrinterIp: "192.168.1.102", cashierPrinterIp: "192.168.1.103", pizzaPrinterIp: "192.168.1.104",
      },
    }),
    db.branch.create({
      data: {
        slug: "branch-2", name: "Dopa · University St.", address: "University Street, opposite the main gate",
        phone: "0790000002", hours: "07:00-01:00", cliqAlias: "DOPAUNI", cliqName: "Dopa Cafe House LLC", tableCount: 16,
        coffeePrinterIp: "192.168.2.101", kitchenPrinterIp: "192.168.2.102", cashierPrinterIp: "192.168.2.103", pizzaPrinterIp: "192.168.2.104",
      },
    }),
  ]);

  const group = (name: string, minSelect: number, maxSelect: number, mods: [string, number][]) =>
    db.modifierGroup.create({
      data: { name, minSelect, maxSelect, modifiers: { create: mods.map(([name, p]) => ({ name, price: jd(p) })) } },
    });

  const milk = await group("Milk", 0, 1, [["Whole milk", 0], ["Oat milk", 0.5], ["Almond milk", 0.5], ["Lactose-free", 0.35]]);
  const sugar = await group("Sugar", 0, 1, [["No sugar", 0], ["Light", 0], ["Medium", 0], ["Extra sweet", 0]]);
  const extras = await group("Coffee extras", 0, 3, [["Extra shot", 0.5], ["Vanilla syrup", 0.35], ["Caramel syrup", 0.35], ["Decaf", 0]]);
  const burgerX = await group("Adjustments", 0, 4, [["No onions", 0], ["No pickles", 0], ["Extra cheese", 0.5], ["Extra patty", 1.75]]);
  const sauces = await group("Sauces", 0, 2, [["Dopa sauce", 0], ["Garlic", 0], ["BBQ", 0], ["Spicy jalapeño", 0.25]]);
  const crust = await group("Crust", 1, 1, [["Thin", 0], ["Thick", 0.5]]);

  const cat = (name: string, kind: string, sortOrder: number) => db.category.create({ data: { name, kind, sortOrder } });
  const hot = await cat("Hot Coffee", "coffee", 1);
  const cold = await cat("Cold Drinks", "coffee", 2);
  const sweets = await cat("Sweets & Bakery", "coffee", 3);
  const breakfast = await cat("Breakfast", "restaurant", 4);
  const pizza = await cat("Pizza", "restaurant", 5);
  const burgers = await cat("Burgers & Sandwiches", "restaurant", 6);
  const pasta = await cat("Pasta & Salads", "restaurant", 7);

  type V = [string, number];
  const SML = (s: number, m: number, l: number): V[] => [["Small", s], ["Medium", m], ["Large", l]];
  const MEAL = (r: number, m: number): V[] => [["Regular", r], ["Meal (fries + drink)", m]];

  let order = 0;
  const item = async (
    categoryId: string, name: string, description: string, station: "coffee" | "kitchen" | "pizza",
    price: number, opts: { variants?: V[]; groups?: { id: string }[]; popular?: boolean } = {},
  ) =>
    db.menuItem.create({
      data: {
        categoryId, name, description, station, basePrice: jd(price), isPopular: !!opts.popular, sortOrder: order++,
        variants: opts.variants && {
          create: opts.variants.map(([name, p], i) => ({ name, price: jd(p), sortOrder: i, isDefault: i === (opts.variants!.length === 3 ? 1 : 0) })),
        },
        modifierGroups: opts.groups && { connect: opts.groups.map((g) => ({ id: g.id })) },
      },
    });

  const coffeeMods = [milk, sugar, extras];
  await item(hot.id, "Espresso", "Double shot of our house blend, Ethiopian and Brazilian beans", "coffee", 1.5, { groups: [sugar, extras] });
  await item(hot.id, "Spanish Latte", "Espresso, sweetened condensed milk and steamed milk", "coffee", 2.75, { variants: SML(2.5, 2.75, 3.25), groups: coffeeMods, popular: true });
  await item(hot.id, "Cappuccino", "Dense, silky foam over a double espresso", "coffee", 2.5, { variants: SML(2.25, 2.5, 3), groups: coffeeMods });
  await item(hot.id, "Flat White", "Velvety microfoam with a clear coffee-forward taste", "coffee", 2.75, { groups: coffeeMods });
  await item(hot.id, "Cardamom Coffee", "Traditional pot with cardamom, serves two", "coffee", 2, { groups: [sugar] });
  await item(hot.id, "V60 Pour Over", "Today's single origin, brewed by hand", "coffee", 3.5);
  await item(cold.id, "Iced Latte", "Espresso and cold milk over ice", "coffee", 2.75, { variants: SML(2.5, 2.75, 3.25), groups: coffeeMods, popular: true });
  await item(cold.id, "Iced Spanish Latte", "The cold take on our bestseller", "coffee", 3, { variants: SML(2.75, 3, 3.5), groups: coffeeMods });
  await item(cold.id, "Cold Brew", "Steeped for 18 hours, smooth and low in acidity", "coffee", 3, { groups: [sugar] });
  await item(cold.id, "Mint Lemonade", "Fresh lemon and mint, blended with ice", "coffee", 2.25, { variants: SML(2, 2.25, 2.75), groups: [sugar] });
  await item(sweets.id, "San Sebastian Cheesecake", "Burnt top, creamy center", "coffee", 3.5, { popular: true });
  await item(sweets.id, "Butter Croissant", "Baked fresh every morning", "coffee", 1.5);
  await item(breakfast.id, "Shakshuka", "Eggs poached in tomato and pepper sauce, with taboon bread", "kitchen", 3.5);
  await item(breakfast.id, "Amman Breakfast Platter", "Hummus, foul, falafel, labneh, olive oil, za'atar and tea", "kitchen", 6.5, { popular: true });
  await item(pizza.id, "Margherita Pizza", "San Marzano tomato, mozzarella, basil", "pizza", 5.5, { variants: SML(4.5, 5.5, 7), groups: [crust], popular: true });
  await item(pizza.id, "Pepperoni Pizza", "Beef pepperoni and mozzarella", "pizza", 6.5, { variants: SML(5.5, 6.5, 8), groups: [crust] });
  await item(burgers.id, "Dopa Classic Burger", "180g beef patty, cheddar, Dopa sauce", "kitchen", 5.5, { variants: MEAL(5.5, 7.5), groups: [burgerX, sauces], popular: true });
  await item(burgers.id, "Crispy Chicken", "Crispy chicken breast, coleslaw, pickles", "kitchen", 4.75, { variants: MEAL(4.75, 6.75), groups: [burgerX, sauces] });
  await item(burgers.id, "Halloumi Sandwich", "Grilled halloumi, tomato, rocket, pesto", "kitchen", 3.75, { variants: MEAL(3.75, 5.75), groups: [sauces] });
  await item(pasta.id, "Chicken Alfredo", "Fettuccine in cream and parmesan sauce", "kitchen", 6);
  await item(pasta.id, "Caesar Salad", "Romaine, croutons, parmesan", "kitchen", 4.25);
  await item(pasta.id, "Fries", "Crispy, with a sauce of your choice", "kitchen", 1.75, { groups: [sauces] });

  // A taste of Quick 86: Cold Brew sold out at branch 1 today.
  const coldBrew = await db.menuItem.findFirstOrThrow({ where: { name: "Cold Brew" } });
  await db.branchItemAvailability.create({ data: { branchId: b1.id, itemId: coldBrew.id, isAvailable: false } });

  console.log(`Seeded 2 branches, 7 categories, ${await db.menuItem.count()} items.`);
}

main().finally(() => db.$disconnect());

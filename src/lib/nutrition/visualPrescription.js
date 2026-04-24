function asObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function toNumber(value) {
  var numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function getMealItems(meal) {
  if (!meal || typeof meal !== 'object') return [];
  if (Array.isArray(meal.itens) && meal.itens.length) return meal.itens;
  if (Array.isArray(meal.alimentos) && meal.alimentos.length) return meal.alimentos;
  if (Array.isArray(meal.items) && meal.items.length) return meal.items;
  return [];
}

function itemToVisualLine(item) {
  var safe = asObject(item);

  var name = String(
    safe.nome ||
    safe.food_name ||
    safe.display_name ||
    safe.name ||
    'Alimento'
  ).trim();

  var portion = String(
    safe.porcao ||
    safe.qtde ||
    safe.quantity ||
    safe.household_measure ||
    safe.default_unit ||
    ''
  ).trim();

  return portion ? (name + ' - ' + portion) : name;
}

function buildVisualPrescription(input) {
  var safeInput = asObject(input);
  var plan = asObject(safeInput.plan);
  var calculation = asObject(safeInput.calculation);

  var sourceMeals = [];
  if (Array.isArray(plan.refeicoes)) sourceMeals = plan.refeicoes;
  else if (Array.isArray(plan.meals)) sourceMeals = plan.meals;

  var visualMeals = sourceMeals.map(function mapMeal(meal) {
    var safeMeal = asObject(meal);
    var mealItems = getMealItems(safeMeal);

    return {
      name: safeMeal.nome || safeMeal.name || 'Refeição',
      time: safeMeal.horario || safeMeal.time || '',
      items: mealItems.map(itemToVisualLine)
    };
  }).filter(function keepMealsWithItems(meal) {
    return Array.isArray(meal.items) && meal.items.length > 0;
  });

  return {
    targetCalories: toNumber(calculation.targetCalories),
    macros: {
      protein: toNumber(asObject(calculation.macros).protein),
      carbs: toNumber(asObject(calculation.macros).carbs),
      fat: toNumber(asObject(calculation.macros).fat)
    },
    meals: visualMeals
  };
}

module.exports = {
  getMealItems,
  itemToVisualLine,
  buildVisualPrescription
};

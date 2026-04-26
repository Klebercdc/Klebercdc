function asObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function toNumber(value) {
  var numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toOptionalNumber(value) {
  var numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
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

function getMealList(plan) {
  if (Array.isArray(plan.refeicoes)) return plan.refeicoes;
  if (Array.isArray(plan.meals)) return plan.meals;
  return [];
}

function resolveNumericFromAliases(source, aliases) {
  var safe = asObject(source);

  for (var i = 0; i < aliases.length; i += 1) {
    var key = aliases[i];
    if (Object.prototype.hasOwnProperty.call(safe, key)) {
      var asNum = toOptionalNumber(safe[key]);
      if (asNum !== null) return asNum;
    }
  }

  return null;
}

function mapMealItem(item) {
  var safe = asObject(item);
  var calories = resolveNumericFromAliases(safe, ['kcal', 'calories', 'calorias']);
  var protein = resolveNumericFromAliases(safe, ['protein', 'proteinas', 'proteína', 'prot']);
  var carbs = resolveNumericFromAliases(safe, ['carbs', 'carboidratos', 'carbo', 'carb']);
  var fat = resolveNumericFromAliases(safe, ['fat', 'gorduras', 'gordura', 'gord']);

  return {
    name: String(safe.nome || safe.food_name || safe.display_name || safe.name || 'Alimento').trim(),
    amount: String(safe.porcao || safe.qtde || safe.quantity || safe.household_measure || safe.default_unit || '').trim(),
    calories: calories,
    protein: protein,
    carbs: carbs,
    fat: fat,
    hasIcon: false
  };
}

function mapMeal(meal) {
  var safeMeal = asObject(meal);
  var mealItems = getMealItems(safeMeal).map(mapMealItem);

  return {
    name: String(safeMeal.nome || safeMeal.name || 'Refeição').trim(),
    time: String(safeMeal.horario || safeMeal.time || '').trim(),
    hasIcon: false,
    removeLegacyOrangeCircle: true,
    items: mealItems,
    style: {
      background: 'premium-dark',
      borderRadius: 22,
      marginBottom: 14,
      allowHorizontalOverflow: false
    }
  };
}

function readTotalMacros(source) {
  var safe = asObject(source);
  return {
    calories: resolveNumericFromAliases(safe, ['kcal', 'calories', 'calorias', 'totalCalories']) || 0,
    protein: resolveNumericFromAliases(safe, ['protein', 'proteinas', 'proteína', 'prot']) || 0,
    carbs: resolveNumericFromAliases(safe, ['carbs', 'carboidratos', 'carbo', 'carb']) || 0,
    fat: resolveNumericFromAliases(safe, ['fat', 'gorduras', 'gordura', 'gord']) || 0,
    fiber: resolveNumericFromAliases(safe, ['fiber', 'fibra']) || 0
  };
}

function buildVisualPrescription(input) {
  var safeInput = asObject(input);
  var plan = asObject(safeInput.plan);
  var calculation = asObject(safeInput.calculation);
  var sourceMeals = getMealList(plan);

  var visualMeals = sourceMeals.map(function toVisual(meal) {
    var normalized = mapMeal(meal);
    return {
      name: normalized.name,
      time: normalized.time,
      items: normalized.items.map(function toLine(item) {
        return item.amount ? (item.name + ' - ' + item.amount) : item.name;
      })
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

function buildDietScreenModel(input) {
  var safeInput = asObject(input);
  var plan = asObject(safeInput.plan);
  var calculation = asObject(safeInput.calculation);
  var sourceMeals = getMealList(plan);
  var meals = sourceMeals.map(mapMeal).filter(function hasItems(meal) {
    return meal.items.length > 0;
  });

  var totalMacros = readTotalMacros(asObject(plan.totalMacros));

  if (totalMacros.calories === 0) totalMacros.calories = toNumber(calculation.targetCalories);
  if (totalMacros.protein === 0) totalMacros.protein = toNumber(asObject(calculation.macros).protein);
  if (totalMacros.carbs === 0) totalMacros.carbs = toNumber(asObject(calculation.macros).carbs);
  if (totalMacros.fat === 0) totalMacros.fat = toNumber(asObject(calculation.macros).fat);

  var macroTotalForPercent = totalMacros.protein + totalMacros.carbs + totalMacros.fat;

  return {
    showLegacyHeader: false,
    header: {
      compact: true,
      leftAction: 'back',
      rightAction: 'pdf',
      title: 'Minha Dieta',
      titleColor: '#FFFFFF',
      titleSize: 32
    },
    topMacroCard: {
      visible: true,
      totalKcal: totalMacros.calories,
      macros: {
        protein: {
          grams: totalMacros.protein,
          percent: macroTotalForPercent ? Math.round((totalMacros.protein * 100) / macroTotalForPercent) : 0
        },
        carbs: {
          grams: totalMacros.carbs,
          percent: macroTotalForPercent ? Math.round((totalMacros.carbs * 100) / macroTotalForPercent) : 0
        },
        fat: {
          grams: totalMacros.fat,
          percent: macroTotalForPercent ? Math.round((totalMacros.fat * 100) / macroTotalForPercent) : 0
        },
        fiber: {
          grams: totalMacros.fiber
        }
      }
    },
    hideLegacyTotalOfDayFooter: true,
    preserveBottomMenu: true,
    listBottomPadding: 110,
    meals: meals,
    textStyle: {
      mealName: {
        color: '#FFFFFF',
        fontSizeMin: 28,
        fontSizeMax: 32,
        fontWeight: 900,
        truncate: false,
        lineBreak: true
      },
      foodName: {
        color: '#FFFFFF',
        fontSizeMin: 18,
        fontSizeMax: 20,
        fontWeight: 700,
        truncate: false
      },
      macroText: {
        color: '#C9CED6'
      }
    }
  };
}

function buildDietPdfModel(input) {
  var safeInput = asObject(input);
  var plan = asObject(safeInput.plan);
  var user = asObject(safeInput.user);
  var calculation = asObject(safeInput.calculation);
  var sourceMeals = getMealList(plan);

  var totalMacros = readTotalMacros(
    asObject(plan.totalMacros || calculation.totals || calculation.macros)
  );

  if (totalMacros.calories === 0) totalMacros.calories = toNumber(calculation.targetCalories);

  var meals = sourceMeals.map(function toPdfMeal(meal) {
    var normalized = mapMeal(meal);
    return {
      time: normalized.time,
      name: normalized.name,
      foods: normalized.items.map(function formatFood(item) {
        return {
          name: item.name,
          amount: item.amount,
          kcal: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat
        };
      })
    };
  }).filter(function keepMeals(meal) {
    return meal.foods.length > 0;
  });

  return {
    autoDownload: true,
    mobileFriendly: true,
    header: {
      logo: {
        src: '/assets/logo-kronia.png',
        width: 140,
        preserveAspectRatio: true,
        fallbackText: 'KRONIA'
      },
      title: 'Plano alimentar KRONIA',
      subtitle: (user.name || 'Usuário') + ' • ' + (safeInput.date || ''),
      objective: String(plan.objetivo || plan.objective || '').trim()
    },
    summary: {
      calories: totalMacros.calories,
      protein: totalMacros.protein,
      carbs: totalMacros.carbs,
      fat: totalMacros.fat,
      fiber: totalMacros.fiber
    },
    meals: meals,
    theme: {
      pageBackground: '#FFFFFF',
      text: '#111111',
      headings: '#111111',
      accent: '#1E7F4F'
    }
  };
}

module.exports = {
  getMealItems,
  itemToVisualLine,
  buildVisualPrescription,
  buildDietScreenModel,
  buildDietPdfModel,
  resolveNumericFromAliases
};

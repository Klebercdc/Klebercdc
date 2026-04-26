const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildVisualPrescription,
  buildPremiumDietFlowModel,
  buildDietScreenModel,
  buildDietPdfModel,
  resolveNumericFromAliases
} = require('../../src/lib/nutrition/visualPrescription');

function fixture() {
  return {
    date: '2026-04-26',
    user: { name: 'Kleber' },
    plan: {
      objetivo: 'Hipertrofia',
      totalMacros: {
        kcal: 2190,
        protein: 160,
        carbs: 342,
        fat: 65,
        fibra: 28
      },
      refeicoes: [
        {
          nome: 'Café da manhã completo',
          horario: '07:00',
          alimentos: [
            { nome: 'Ovos mexidos', qtde: '2 un', calorias: 155, prot: 13, carb: 1.1, gord: 11 },
            { nome: 'Aveia', qtde: '60 g', calories: 230, protein: 8, carbs: 39, fat: 4.5 }
          ]
        },
        {
          nome: 'Almoço',
          horario: '12:30',
          itens: [
            { nome: 'Frango grelhado', qtde: '150 g', kcal: 250, proteína: 45, carboidratos: 0, gorduras: 5 },
            { nome: 'Arroz cozido', qtde: '120 g', calorias: 156, proteinas: 3, carbo: 34, gordura: 0.4 }
          ]
        }
      ]
    },
    calculation: {
      targetCalories: 2200,
      macros: { protein: 160, carbs: 342, fat: 65 }
    }
  };
}

test('buildVisualPrescription preserva itens legados em alimentos/qtde', () => {
  const visual = buildVisualPrescription(fixture());

  assert.deepEqual(visual.meals[1].items, [
    'Frango grelhado - 150 g',
    'Arroz cozido - 120 g'
  ]);
});

test('Minha Dieta renderiza sem header legado e com cabeçalho compacto + PDF', () => {
  const screen = buildDietScreenModel(fixture());

  assert.equal(screen.showLegacyHeader, false);
  assert.equal(screen.header.compact, true);
  assert.equal(screen.header.leftAction, 'back');
  assert.equal(screen.header.rightAction, 'pdf');
  assert.equal(screen.header.title, 'Minha Dieta');
});

test('cards de refeição e itens não renderizam ícones e não truncam nomes', () => {
  const screen = buildDietScreenModel(fixture());

  assert.ok(screen.meals.length > 0);
  assert.equal(screen.textStyle.mealName.truncate, false);
  assert.equal(screen.textStyle.foodName.truncate, false);

  screen.meals.forEach((meal) => {
    assert.equal(meal.hasIcon, false);
    meal.items.forEach((food) => {
      assert.equal(food.hasIcon, false);
    });
  });
});

test('card de macros aparece no topo e total do dia do rodapé fica oculto', () => {
  const screen = buildDietScreenModel(fixture());

  assert.equal(screen.topMacroCard.visible, true);
  assert.equal(screen.topMacroCard.totalKcal, 2190);
  assert.equal(screen.topMacroCard.macros.protein.grams, 160);
  assert.equal(screen.topMacroCard.macros.carbs.grams, 342);
  assert.equal(screen.topMacroCard.macros.fat.grams, 65);
  assert.equal(screen.topMacroCard.macros.fiber.grams, 28);
  assert.equal(screen.hideLegacyTotalOfDayFooter, true);
});

test('botão PDF aparece no cabeçalho e layout preserva espaçamento do menu inferior', () => {
  const screen = buildDietScreenModel(fixture());

  assert.equal(screen.header.rightAction, 'pdf');
  assert.equal(screen.preserveBottomMenu, true);
  assert.ok(screen.listBottomPadding >= 100);
});

test('PDF contém logo KroniA (ou fallback), resumo de macros e refeições completas', () => {
  const pdf = buildDietPdfModel(fixture());

  assert.equal(pdf.autoDownload, true);
  assert.equal(pdf.header.logo.src, '/assets/logo-kronia.png');
  assert.equal(pdf.header.logo.fallbackText, 'KRONIA');

  assert.equal(pdf.summary.calories, 2190);
  assert.equal(pdf.summary.protein, 160);
  assert.equal(pdf.summary.carbs, 342);
  assert.equal(pdf.summary.fat, 65);
  assert.equal(pdf.summary.fiber, 28);

  assert.ok(pdf.meals.length >= 2);
  assert.equal(pdf.meals[0].name, 'Café da manhã completo');
  assert.ok(pdf.meals[0].foods[0].kcal !== null);
  assert.ok(pdf.meals[0].foods[0].protein !== null);
  assert.ok(pdf.meals[0].foods[0].carbs !== null);
  assert.ok(pdf.meals[0].foods[0].fat !== null);
});

test('mapeamento de macros do PDF não retorna "-" quando existem aliases válidos', () => {
  assert.equal(resolveNumericFromAliases({ kcal: 100 }, ['kcal', 'calories', 'calorias']), 100);
  assert.equal(resolveNumericFromAliases({ calories: 101 }, ['kcal', 'calories', 'calorias']), 101);
  assert.equal(resolveNumericFromAliases({ calorias: 102 }, ['kcal', 'calories', 'calorias']), 102);

  assert.equal(resolveNumericFromAliases({ protein: 20 }, ['protein', 'proteinas', 'proteína', 'prot']), 20);
  assert.equal(resolveNumericFromAliases({ proteinas: 21 }, ['protein', 'proteinas', 'proteína', 'prot']), 21);
  assert.equal(resolveNumericFromAliases({ 'proteína': 22 }, ['protein', 'proteinas', 'proteína', 'prot']), 22);
  assert.equal(resolveNumericFromAliases({ prot: 23 }, ['protein', 'proteinas', 'proteína', 'prot']), 23);

  assert.equal(resolveNumericFromAliases({ carbs: 30 }, ['carbs', 'carboidratos', 'carbo', 'carb']), 30);
  assert.equal(resolveNumericFromAliases({ carboidratos: 31 }, ['carbs', 'carboidratos', 'carbo', 'carb']), 31);
  assert.equal(resolveNumericFromAliases({ carbo: 32 }, ['carbs', 'carboidratos', 'carbo', 'carb']), 32);
  assert.equal(resolveNumericFromAliases({ carb: 33 }, ['carbs', 'carboidratos', 'carbo', 'carb']), 33);

  assert.equal(resolveNumericFromAliases({ fat: 9 }, ['fat', 'gorduras', 'gordura', 'gord']), 9);
  assert.equal(resolveNumericFromAliases({ gorduras: 10 }, ['fat', 'gorduras', 'gordura', 'gord']), 10);
  assert.equal(resolveNumericFromAliases({ gordura: 11 }, ['fat', 'gorduras', 'gordura', 'gord']), 11);
  assert.equal(resolveNumericFromAliases({ gord: 12 }, ['fat', 'gorduras', 'gordura', 'gord']), 12);
});

test('novo fluxo premium de dieta possui 4 etapas, visual dark e preserva menu inferior', () => {
  const flow = buildPremiumDietFlowModel({});

  assert.equal(flow.title, 'Gerar dieta com IA');
  assert.equal(flow.theme.mode, 'dark-premium');
  assert.equal(flow.theme.glow, 'moderate-green');
  assert.equal(flow.preserveBottomMenu, true);
  assert.equal(flow.progress.totalSteps, 4);
  assert.deepEqual(flow.progress.steps.map((step) => step.label), [
    'Perfil base',
    'Ajuste do dia',
    'Resumo',
    'Gerar dieta'
  ]);
});

test('novo fluxo pula etapa 1 quando usuário já possui perfil salvo', () => {
  const flow = buildPremiumDietFlowModel({
    hasSavedProfile: true,
    savedProfile: {
      objective: 'manter peso',
      activityLevel: 'moderado',
      weight: '70 kg',
      height: '1,75 m',
      age: '28',
      sex: 'masculino'
    }
  });

  assert.equal(flow.steps[0].autoSkipped, true);
  assert.equal(flow.steps[0].required, false);
  assert.equal(flow.steps[0].fields[0].value, 'manter peso');
  assert.equal(flow.steps[0].fields[1].value, 'moderado');
});

test('novo fluxo substitui perguntas legadas e mantém seleção de refeições no ajuste do dia', () => {
  const flow = buildPremiumDietFlowModel({
    dailyAdjustments: {
      mealsPerDay: 4,
      hungerToday: 'normal',
      trainingWindow: 'tarde',
      quickPreferences: ['flexível', 'alta proteína']
    }
  });

  const step2 = flow.steps[1];
  const mealsField = step2.fields.find((field) => field.key === 'mealsPerDay');

  assert.equal(mealsField.label, 'Quantas refeições por dia');
  assert.deepEqual(mealsField.options, ['3', '4', '5', '6']);
  assert.equal(mealsField.value, '4');

  const asText = JSON.stringify(flow);
  assert.equal(asText.includes('Quantas refeições você prefere por dia?'), false);
  assert.equal(asText.includes('prompt('), false);
  assert.equal(asText.includes('alert('), false);
  assert.equal(asText.includes('confirm('), false);
});

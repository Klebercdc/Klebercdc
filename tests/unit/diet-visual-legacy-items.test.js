const test = require('node:test');
const assert = require('node:assert/strict');

const { buildVisualPrescription } = require('../../src/lib/nutrition/visualPrescription');

test('buildVisualPrescription preserva itens legados em alimentos/qtde', () => {
  const visual = buildVisualPrescription({
    plan: {
      refeicoes: [{
        nome: 'Almoço',
        horario: '12:30',
        alimentos: [
          { nome: 'Frango grelhado', qtde: '150 g' },
          { nome: 'Arroz cozido', qtde: '120 g' }
        ]
      }]
    },
    calculation: {
      targetCalories: 2200,
      macros: { protein: 160, carbs: 220, fat: 60 }
    }
  });

  assert.deepEqual(visual.meals[0].items, [
    'Frango grelhado - 150 g',
    'Arroz cozido - 120 g'
  ]);
});

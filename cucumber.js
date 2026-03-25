module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: ['test/features/step-definitions/**/*.ts'],
    paths: ['test/features/**/*.feature'],
    format: [
      'progress',
      'json:test/reports/cucumber-report.json',
    ],
    publishQuiet: true,
  },
};

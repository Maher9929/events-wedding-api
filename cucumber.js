module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: ['test/features/step-definitions/**/*.ts'],
    paths: ['test/features/**/*.feature'],
    format: ['progress', 'html:test/reports/cucumber-report.html'],
    publishQuiet: true,
  },
};

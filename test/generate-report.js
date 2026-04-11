const reporter = require('cucumber-html-reporter');
const fs = require('fs');
const path = require('path');

const reportsDir = path.join(__dirname, 'reports');
const jsonFile = path.join(reportsDir, 'cucumber-report.json');
const outputFile = path.join(reportsDir, 'rapport-tests.html');
const screenshotsDir = path.join(reportsDir, 'screenshots');
const htmlDumpsDir = path.join(reportsDir, 'html-dumps');

if (!fs.existsSync(jsonFile)) {
  console.error('Fichier JSON non trouve:', jsonFile);
  console.error("Lance d'abord: npm run test:cucumber");
  process.exit(1);
}

try {
  JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
} catch (error) {
  console.error('Fichier JSON Cucumber invalide:', jsonFile);
  console.error(
    error instanceof Error ? error.message : 'Le rapport JSON est illisible.',
  );
  process.exit(1);
}

reporter.generate({
  theme: 'bootstrap',
  jsonFile,
  output: outputFile,
  reportSuiteAsScenarios: true,
  scenarioTimestamp: true,
  launchReport: false,
  metadata: {
    Projet: 'Dousha - Events & Wedding Marketplace',
    Plateforme: process.platform,
    Navigateur:
      process.env.SELENIUM_HEADLESS === 'false'
        ? 'Chrome'
        : 'Chrome Headless',
    'Framework Backend': 'NestJS',
    'Framework Frontend': 'React + Vite',
    'Base de donnees': 'Supabase (PostgreSQL)',
    'Date du test': new Date().toLocaleString('fr-FR'),
  },
});

console.log(`\nRapport HTML genere: ${outputFile}`);
console.log(`Screenshots des echecs: ${screenshotsDir}`);
console.log(`HTML dumps des echecs: ${htmlDumpsDir}\n`);

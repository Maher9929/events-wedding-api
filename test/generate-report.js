const reporter = require('cucumber-html-reporter');
const path = require('path');
const fs = require('fs');

const reportsDir = path.join(__dirname, 'reports');
const jsonFile = path.join(reportsDir, 'cucumber-report.json');
const outputFile = path.join(reportsDir, 'rapport-tests.html');

// Check if JSON report exists
if (!fs.existsSync(jsonFile)) {
  console.error('❌ Fichier JSON non trouvé:', jsonFile);
  console.error('   Lancez d\'abord: npm run test:cucumber');
  process.exit(1);
}

const options = {
  theme: 'bootstrap',
  jsonFile: jsonFile,
  output: outputFile,
  reportSuiteAsScenarios: true,
  scenarioTimestamp: true,
  launchReport: true,
  metadata: {
    'Projet': 'Dousha - Events & Wedding Marketplace',
    'Plateforme': 'Windows',
    'Navigateur': 'Chrome (Headless)',
    'Framework Backend': 'NestJS',
    'Framework Frontend': 'React + Vite',
    'Base de données': 'Supabase (PostgreSQL)',
    'Date du test': new Date().toLocaleDateString('fr-FR', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }),
  },
};

reporter.generate(options);

console.log(`\n✅ Rapport HTML généré: ${outputFile}`);
console.log('📸 Les captures d\'écran des échecs sont intégrées dans le rapport.\n');

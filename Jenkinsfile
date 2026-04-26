pipeline {
    agent any

    tools {
        nodejs 'NodeJS-18'
    }

    environment {
        CI = 'true'
        SELENIUM_HEADLESS = 'true'
    }

    stages {
        // ─── Stage 1: Installation ──────────────────────────────────────
        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
                dir('frontend') {
                    sh 'npm ci'
                }
            }
        }

        // ─── Stage 2: TypeScript Check ──────────────────────────────────
        stage('TypeScript Check') {
            parallel {
                stage('Backend TSC') {
                    steps {
                        sh 'npx tsc --noEmit'
                    }
                }
                stage('Frontend TSC') {
                    steps {
                        dir('frontend') {
                            sh 'npx tsc --noEmit'
                        }
                    }
                }
            }
        }

        // ─── Stage 3: Unit Tests (Jest + JUnit XML) ────────────────────
        stage('Unit Tests') {
            steps {
                sh 'npm run test:junit'
            }
            post {
                always {
                    junit 'test/reports/junit-report.xml'
                }
            }
        }

        // ─── Stage 4: Test Coverage ─────────────────────────────────────
        stage('Test Coverage') {
            steps {
                sh 'npm run test:cov -- --forceExit'
            }
            post {
                always {
                    publishHTML(target: [
                        reportDir: 'coverage/lcov-report',
                        reportFiles: 'index.html',
                        reportName: 'Coverage Report'
                    ])
                }
            }
        }

        // ─── Stage 5: E2E Tests (Selenium + Cucumber) ──────────────────
        stage('E2E Tests') {
            steps {
                sh 'npm run test:ui'
            }
            post {
                always {
                    junit 'test/reports/cucumber-junit.xml'
                    publishHTML(target: [
                        reportDir: 'test/reports',
                        reportFiles: 'rapport-tests.html',
                        reportName: 'Cucumber E2E Report'
                    ])
                    archiveArtifacts artifacts: 'test/reports/screenshots/**', allowEmptyArchive: true
                }
            }
        }

        // ─── Stage 6: Build ────────────────────────────────────────────
        stage('Build') {
            parallel {
                stage('Build Backend') {
                    steps {
                        sh 'npm run build'
                    }
                }
                stage('Build Frontend') {
                    steps {
                        dir('frontend') {
                            sh 'npm run build'
                        }
                    }
                }
            }
        }
    }

    post {
        always {
            echo 'Pipeline finished.'
        }
        success {
            echo '✅ All tests passed, build successful.'
        }
        failure {
            echo '❌ Failure detected — check reports.'
        }
    }
}

pipeline {
    agent {
        docker {
            image 'node:24-alpine'
            args '-u root:root'
        }
    }

    options {
        timeout(time: 25, unit: 'MINUTES')
        timestamps()
        disableConcurrentBuilds()
    }

    environment {
        CI = 'true'
        npm_config_fund = 'false'
        npm_config_audit = 'false'
    }

    stages {
        stage('Install') {
            steps {
                sh 'node -v && npm -v'
                sh 'npm ci'
            }
        }

        stage('Dependency Audit') {
            steps {
                sh 'npm audit --omit=dev --audit-level=high'
            }
        }

        stage('Lint') {
            steps {
                sh 'npx eslint .'
            }
        }

        stage('Typecheck') {
            steps {
                sh 'npx tsc -b'
            }
        }

        stage('Unit Tests + Coverage') {
            steps {
                sh 'npx vitest run --coverage'
            }
            post {
                always {
                    archiveArtifacts artifacts: 'coverage/**', allowEmptyArchive: true
                }
            }
        }

        stage('Dataset Verification') {
            steps {
                sh 'node scripts/verifyData.mjs'
            }
        }

        stage('Production Build') {
            steps {
                sh 'npm run build'
            }
            post {
                success {
                    archiveArtifacts artifacts: 'dist/**', fingerprint: true
                }
            }
        }

        stage('Bundle Budget') {
            steps {
                sh 'node scripts/checkBundleSize.mjs'
            }
        }
    }

    post {
        failure {
            echo 'Pipeline failed. Check the stage logs above.'
        }
    }
}

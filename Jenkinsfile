pipeline {
    agent {
        docker {
            image 'node:24-alpine'
        }
    }

    options {
        timeout(time: 15, unit: 'MINUTES')
        disableConcurrentBuilds()
        ansiColor('xterm')
    }

    environment {
        CI = 'true'
    }

    stages {
        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Supply Chain Audit') {
            steps {
                sh 'npm audit --omit=dev --audit-level=high'
            }
        }

        stage('Static Quality Analysis') {
            parallel {
                stage('ESLint') {
                    steps {
                        sh 'npm run lint'
                    }
                }
                stage('TypeScript Verification') {
                    steps {
                        sh 'npm run typecheck'
                    }
                }
            }
        }

        stage('Unit Test Suite') {
            steps {
                sh 'npm test'
            }
        }

        stage('Dataset Integrity Verification') {
            steps {
                sh 'npm run data:verify'
            }
        }

        stage('Production Compilation') {
            steps {
                sh 'npm run build'
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        success {
            echo '✅ Jenkins Plugin Modernizer Dashboard: All stages, quality gates, and dataset verifications passed.'
        }
        failure {
            echo '❌ Pipeline quality gate failed. Inspect stage output for details.'
        }
    }
}

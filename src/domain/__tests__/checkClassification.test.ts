import { describe, it, expect } from 'vitest';
import {
  classifyCheckValue,
  classifyBOM,
  classifyParentPom,
  classifyCI,
  classifyBuild,
  classifyTest,
  classifySecurity,
  classifyCVE,
  classifyAllChecks,
} from '../checkClassification';

describe('checkClassification', () => {
  describe('classifyCheckValue', () => {
    it('normalizes status variants correctly', () => {
      expect(classifyCheckValue('SUCCESS')).toBe('passed');
      expect(classifyCheckValue('passed')).toBe('passed');
      expect(classifyCheckValue('OK')).toBe('passed');
      expect(classifyCheckValue('FAILURE')).toBe('failed');
      expect(classifyCheckValue('fail')).toBe('failed');
      expect(classifyCheckValue('error')).toBe('failed');
      expect(classifyCheckValue('pending')).toBe('pending');
      expect(classifyCheckValue('running')).toBe('pending');
      expect(classifyCheckValue('unknown')).toBe('unknown');
      expect(classifyCheckValue('')).toBe('unknown');
      expect(classifyCheckValue(null)).toBe('unreported');
      expect(classifyCheckValue(undefined)).toBe('unreported');
    });
  });

  describe('classifyBOM', () => {
    it('detects BOM status regardless of key casing or full label', () => {
      expect(classifyBOM({ BOM: 'success' }).status).toBe('passed');
      expect(classifyBOM({ 'Jenkins BOM Alignment': 'failure' }).status).toBe('failed');
      expect(classifyBOM({ 'bom-check': 'pending' }).status).toBe('pending');
      expect(classifyBOM({ unrelated: 'success' }).status).toBe('unreported');
      expect(classifyBOM(undefined).status).toBe('unreported');
    });
  });

  describe('classifyParentPom', () => {
    it('detects Parent POM status regardless of key casing', () => {
      expect(classifyParentPom({ 'Parent POM': 'success' }).status).toBe('passed');
      expect(classifyParentPom({ 'parent-pom-upgrade': 'fail' }).status).toBe('failed');
      expect(classifyParentPom({}).status).toBe('unreported');
    });
  });

  describe('classifyCI', () => {
    it('prioritizes summary if provided, else falls back to checkRuns', () => {
      expect(classifyCI('success', {}).status).toBe('passed');
      expect(classifyCI('failure', {}).status).toBe('failed');
      expect(classifyCI('', { 'Jenkins CI': 'success' }).status).toBe('passed');
      expect(classifyCI(undefined, { 'build-test': 'failure' }).status).toBe('failed');
      expect(classifyCI(undefined, {}).status).toBe('unreported');
    });
  });

  describe('classifySecurity', () => {
    it('identifies security risks if any security/CVE check failed', () => {
      const res = classifySecurity({
        'Security Scan': 'success',
        'CVE Audit': 'failure',
      });
      expect(res.status).toBe('failed');
      expect(res.hasSecurityRisk).toBe(true);
      expect(res.isSecurityPassed).toBe(false);
    });

    it('identifies clean security posture when all security checks pass', () => {
      const res = classifySecurity({
        'Security Scan': 'success',
        'CVE-Audit': 'success',
      });
      expect(res.status).toBe('passed');
      expect(res.hasSecurityRisk).toBe(false);
      expect(res.isSecurityPassed).toBe(true);
    });

    it('reports unreported when no security checks exist', () => {
      const res = classifySecurity({
        BOM: 'success',
      });
      expect(res.status).toBe('unreported');
      expect(res.hasSecurityRisk).toBe(false);
      expect(res.isSecurityPassed).toBe(false);
    });
  });

  describe('classifyBuild', () => {
    it('detects build status from summary or checkRuns', () => {
      expect(classifyBuild({}, 'Maven Build Passed').status).toBe('passed');
      expect(classifyBuild({ 'maven-compile': 'failure' }).status).toBe('failed');
      expect(classifyBuild({ 'package-jar': 'success' }).status).toBe('passed');
    });
  });

  describe('classifyTest', () => {
    it('detects test status from test-specific runners', () => {
      expect(classifyTest({ 'jth-test': 'failure' }).status).toBe('failed');
      expect(classifyTest({ 'surefire-report': 'success' }).status).toBe('passed');
      expect(classifyTest({ unrelated: 'success' }).status).toBe('unreported');
    });
  });

  describe('classifyCVE', () => {
    it('detects CVE vulnerabilities specifically', () => {
      const res = classifyCVE({ 'CVE-2026-1234': 'failure' });
      expect(res.status).toBe('failed');
      expect(res.hasSecurityRisk).toBe(true);
    });

    it('returns clean when CVE checks pass', () => {
      const res = classifyCVE({ 'cve-audit': 'success' });
      expect(res.status).toBe('passed');
      expect(res.isSecurityPassed).toBe(true);
    });
  });

  describe('classifyAllChecks', () => {
    it('returns structured summary across all categories', () => {
      const all = classifyAllChecks(
        {
          BOM: 'success',
          'Parent Pom': 'failure',
          'Security Review': 'success',
          'CVE-Check': 'success',
          'surefire-tests': 'success',
        },
        'success'
      );
      expect(all.bom.status).toBe('passed');
      expect(all.parentPom.status).toBe('failed');
      expect(all.ci.status).toBe('passed');
      expect(all.test.status).toBe('passed');
      expect(all.security.isSecurityPassed).toBe(true);
      expect(all.cve.isSecurityPassed).toBe(true);
    });
  });
});

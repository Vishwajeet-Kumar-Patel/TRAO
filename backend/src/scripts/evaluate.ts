import fs from 'fs';
import path from 'path';
import {
  BatchCaseInput,
  BatchCaseOutput,
  BatchOutputDocument,
} from '@prep-kit/shared';
import { runKitGenerationPipeline } from '../services/pipeline.js';

process.env.IS_EVALUATION = 'true';
process.env.ALLOW_LOCALHOST_SSRF = 'true';

interface ParsedArgs {
  inputPath: string;
  outputPath: string;
}

function parseCommandLineArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  let inputPath = '';
  let outputPath = '';
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--input' || arg === '-i') {
      if (args[i + 1] && !args[i + 1].startsWith('-')) {
        inputPath = args[i + 1];
        i++;
      }
    } else if (arg.startsWith('--input=')) {
      inputPath = arg.split('=')[1];
    } else if (arg === '--output' || arg === '-o') {
      if (args[i + 1] && !args[i + 1].startsWith('-')) {
        outputPath = args[i + 1];
        i++;
      }
    } else if (arg.startsWith('--output=')) {
      outputPath = arg.split('=')[1];
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
  }

  // Check npm env configs ONLY if they are not boolean string "true"
  if (!inputPath && process.env.npm_config_input && process.env.npm_config_input !== 'true') {
    inputPath = process.env.npm_config_input;
  }
  if (!outputPath && process.env.npm_config_output && process.env.npm_config_output !== 'true') {
    outputPath = process.env.npm_config_output;
  }

  // Fallback to positional arguments
  if (!inputPath && positional.length >= 1) {
    inputPath = positional[0];
  }
  if (!outputPath && positional.length >= 2) {
    outputPath = positional[1];
  }

  if (!inputPath || !outputPath) {
    console.error('Usage: npm run evaluate -- --input <cases.json> --output <kits.json>');
    process.exit(1);
  }

  return {
    inputPath: path.resolve(process.cwd(), inputPath),
    outputPath: path.resolve(process.cwd(), outputPath),
  };
}

async function runBatchEvaluation() {
  const { inputPath, outputPath } = parseCommandLineArgs();

  console.log(`[Batch Evaluation] Reading test cases from: ${inputPath}`);

  if (!fs.existsSync(inputPath)) {
    console.error(`[Batch Evaluation] Input file not found: ${inputPath}`);
    process.exit(1);
  }

  let rawCases: unknown;
  try {
    const fileContent = fs.readFileSync(inputPath, 'utf-8');
    rawCases = JSON.parse(fileContent);
  } catch (err: unknown) {
    console.error(`[Batch Evaluation] Failed to parse input JSON: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  if (!Array.isArray(rawCases)) {
    console.error('[Batch Evaluation] Input file must contain a JSON array of cases.');
    process.exit(1);
  }

  const cases: BatchCaseInput[] = rawCases;
  console.log(`[Batch Evaluation] Processing ${cases.length} evaluation case(s)...`);

  const results: BatchCaseOutput[] = [];

  for (let i = 0; i < cases.length; i++) {
    const item = cases[i];
    const caseId = item.id || `case-${i + 1}`;
    console.log(`\n--------------------------------------------------`);
    console.log(`[Case ${i + 1}/${cases.length}] ID: ${caseId}`);
    console.log(`  Company URL: ${item.company_url}`);
    console.log(`  Days: ${item.days}`);
    console.log(`--------------------------------------------------`);

    try {
      const kit = await runKitGenerationPipeline({
        jd: item.jd,
        companyUrl: item.company_url,
        days: item.days,
        onProgress: (prog) => {
          process.stdout.write(`  [${prog.stage}] ${prog.message} (${prog.percentage}%)\r`);
        },
      });

      console.log(`\n  ✓ Case ${caseId} generated successfully.`);
      results.push({
        id: caseId,
        status: 'ok',
        kit,
        error: null,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`\n  ✗ Case ${caseId} failed: ${errorMsg}`);

      results.push({
        id: caseId,
        status: 'failed',
        kit: null,
        error: {
          code: 'GENERATION_ERROR',
          message: errorMsg,
        },
      });
    }
  }

  const outputDoc: BatchOutputDocument = {
    version: '1.0',
    generated_at: new Date().toISOString(),
    kits: results,
  };

  // Ensure output directory exists
  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(outputDoc, null, 2), 'utf-8');
  console.log(`\n==================================================`);
  console.log(`[Batch Evaluation] Completed! Results written to: ${outputPath}`);
  console.log(`  Total: ${cases.length} | Succeeded: ${results.filter((r) => r.status === 'ok').length} | Failed: ${results.filter((r) => r.status === 'failed').length}`);
  console.log(`==================================================\n`);
}

runBatchEvaluation().catch((err) => {
  console.error('[Batch Evaluation] Fatal error during evaluation:', err);
  process.exit(1);
});

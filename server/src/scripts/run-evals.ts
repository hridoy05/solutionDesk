import "dotenv/config";
import { runBraintrustEval } from "../lib/ai-eval";

async function main() {
  console.log("=================================================");
  console.log("    SolutionDesk AI Eval with Braintrust");
  console.log("=================================================");
  console.log("Running evaluation dataset with Braintrust & autoevals...\n");

  const startTime = Date.now();
  const summary = await runBraintrustEval();
  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log("\n=================================================");
  console.log("              Braintrust Eval Report");
  console.log("=================================================");
  console.log(`Experiment:     ${summary.experimentName}`);
  console.log(`Total Tests:    ${summary.totalTests}`);
  console.log(`Passed:         ${summary.passedTests}/${summary.totalTests}`);
  console.log(`Duration:       ${durationSec}s`);
  console.log("\nTest Case Breakdown:");
  for (const item of summary.results) {
    const symbol = item.passed ? "✅ PASS" : "❌ FAIL";
    console.log(`  ${symbol} [${item.scorerName}] ${item.task}`);
    console.log(`     Output:   ${item.output}`);
    console.log(`     Expected: ${item.expected}`);
    console.log(`     Score:    ${item.score}`);
  }

  console.log("\nAggregate Metric Scores (autoevals):");
  for (const [scoreName, scoreData] of Object.entries(summary.scores)) {
    const scorePct = `${(scoreData.score * 100).toFixed(1)}%`;
    console.log(`  - ${scoreName}: ${scorePct} (n=${scoreData.count})`);
  }

  console.log("=================================================\n");
  console.log("Braintrust evaluation completed successfully! ✨\n");
}

main().catch((err) => {
  console.error("Fatal error during evaluation run:", err);
  process.exit(1);
});

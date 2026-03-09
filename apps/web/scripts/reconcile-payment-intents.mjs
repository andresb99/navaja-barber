/* global console, process */

import { reconcileMercadoPagoPaymentIntents } from '../lib/payment-intents.server.ts';

function parseArgValue(name) {
  const prefix = `--${name}=`;
  const matched = process.argv.find((entry) => entry.startsWith(prefix));
  return matched ? matched.slice(prefix.length).trim() : null;
}

async function main() {
  const limitValue = Number(parseArgValue('limit') || '25');
  const shopId = parseArgValue('shop-id');
  const results = await reconcileMercadoPagoPaymentIntents({
    limit: Number.isFinite(limitValue) ? limitValue : 25,
    shopId,
  });

  const summary = results.reduce(
    (accumulator, item) => {
      if (item.ignored) {
        accumulator.ignored += 1;
      } else if (item.processed) {
        accumulator.alreadyProcessed += 1;
      } else if (item.status === 'approved') {
        accumulator.approved += 1;
      } else {
        accumulator.updated += 1;
      }

      return accumulator;
    },
    {
      approved: 0,
      updated: 0,
      ignored: 0,
      alreadyProcessed: 0,
    },
  );

  console.table(results);
  console.log(
    JSON.stringify(
      {
        scanned: results.length,
        ...summary,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'No se pudo reconciliar payment intents.');
  process.exitCode = 1;
});

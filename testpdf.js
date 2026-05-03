const { generateComplianceReport } = require('./lib/pdf.js');
const fs = require('fs');

const dummyData = {
  address: "11111111111111111111111111111111",
  risk: { score: 10, level: "CLEAN", flags: [] },
  meta: { fetchedAt: Date.now() },
  breakdown: {
    flags: [],
    typologies: {}
  },
  trace: {
    transactionBehavior: { analyzed: 100, spanDays: 30, txPerDay: 3, failedTx7d: 0, types: {} },
    valueFlow: { netFlow: 1, transferCount: 1, depositVolume: 1, withdrawalVolume: 0 },
    counterparties: { uniqueInbound: 1, uniqueOutbound: 1, totalUnique: 2, topCounterparties: [] },
    protocolExposure: [],
    explanation: "test",
    typologies: {}
  }
};

const stream = fs.createWriteStream('test.pdf');
try {
  generateComplianceReport(dummyData, stream);
  console.log('Success');
} catch (e) {
  console.error('Error generating PDF:', e);
}

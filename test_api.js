const roast = require('./api/roast.js');
const req = {
  method: 'POST',
  json: async () => ({
    text: "hello world, this is a bad text. please roast me.",
    category: "Startup Pitch",
    targetGoal: "better",
    intensity: "medium"
  })
};
async function run() {
  try {
    const res = await roast.default(req);
    const body = await res.json();
    console.log("Status:", res.status);
    console.log("Body:", JSON.stringify(body, null, 2));
  } catch(e) {
    console.error("Crash:", e);
  }
}
run();

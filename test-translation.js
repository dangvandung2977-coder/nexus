const { parseFile, processTranslation } = require("./src/lib/translation");

async function testTranslation() {
  const content = `
messages:
  welcome: "&aWelcome to the server, %player%!"
  prefix: "&8[&6Nexus&8] &7"
  no_permission: "&cYou don't have permission to do that."
`.trim();

  const job = {
    original_filename: "messages_en.yml",
    target_language: "vi"
  };

  console.log("Starting test translation...");
  try {
    const { output, translatedCount } = await processTranslation(job, content);
    console.log("-----------------------------------------");
    console.log("Translated Count:", translatedCount);
    console.log("Output:");
    console.log(output);
    console.log("-----------------------------------------");
  } catch (error) {
    console.error("Translation processing failed:", error);
  }
}

testTranslation();

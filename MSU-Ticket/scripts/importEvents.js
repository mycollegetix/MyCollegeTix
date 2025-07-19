// scripts/importEventsWorking.js - Working version for MSU
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

console.log("🔧 Starting import script...");

// Environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials in .env file");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// MSU College ID - this is your actual MSU ID from the debug
const MSU_COLLEGE_ID = "2f6908a3-dddd-420e-a891-be2c2f9545a9";

// Sports mapping for consistency
const SPORT_MAPPING = {
  "women's soccer": "Soccer",
  "men's soccer": "Soccer",
  soccer: "Soccer",
  "field hockey": "Field Hockey",
  volleyball: "Volleyball",
  football: "Football",
  "men's football": "Football",
  basketball: "Basketball",
  "men's basketball": "Basketball",
  "women's basketball": "Basketball",
  hockey: "Hockey",
  baseball: "Baseball",
  softball: "Softball",
  tennis: "Tennis",
  golf: "Golf",
  track: "Track & Field",
  "cross country": "Cross Country",
  wrestling: "Wrestling",
  gymnastics: "Gymnastics",
  swimming: "Swimming & Diving",
  diving: "Swimming & Diving",
};

// Parse events from text content
function parseEvents(content, sourceFile) {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line);
  const events = [];
  let i = 0;

  console.log(`📄 Processing ${lines.length} lines from ${sourceFile}`);

  while (i < lines.length) {
    const line = lines[i];

    // Check for date line
    const dateMatch = line.match(
      /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s*(.+)/i
    );

    if (dateMatch) {
      const currentDate = dateMatch[2];
      console.log(`📅 Found date: ${currentDate}`);

      i++; // Move to next line

      // Process all events for this date
      while (i < lines.length) {
        const eventLine = lines[i];

        // Stop if we hit another date
        if (
          eventLine.match(
            /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),/i
          )
        ) {
          break;
        }

        // Skip empty lines or headers
        if (
          !eventLine ||
          eventLine.includes("Composite Calendar") ||
          eventLine.includes("University Athletics")
        ) {
          i++;
          continue;
        }

        // Check if this line contains a sport (is an event line)
        const isEventLine = eventLine.match(
          /^(Women's |Men's )?(Soccer|Football|Volleyball|Field Hockey|Basketball|Hockey|Baseball|Softball|Tennis|Golf|Track|Wrestling|Swimming|Diving)/i
        );

        if (isEventLine) {
          console.log(`🎯 Found event: "${eventLine}"`);

          // Collect location info from subsequent lines
          const eventInfo = { eventLine, locationLines: [] };
          let j = i + 1;

          // Look ahead for location lines (non-event lines)
          while (j < lines.length) {
            const nextLine = lines[j];

            // Stop if we hit another date
            if (
              nextLine.match(
                /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),/i
              )
            ) {
              break;
            }

            // Stop if we hit another event
            if (
              nextLine.match(
                /^(Women's |Men's )?(Soccer|Football|Volleyball|Field Hockey|Basketball|Hockey|Baseball|Softball|Tennis|Golf|Track|Wrestling|Swimming|Diving)/i
              )
            ) {
              break;
            }

            // This must be a location line
            if (
              nextLine &&
              !nextLine.includes("Composite Calendar") &&
              !nextLine.includes("University Athletics")
            ) {
              eventInfo.locationLines.push(nextLine);
              console.log(`    📍 Location: "${nextLine}"`);
            }

            j++;
          }

          // Parse the complete event
          const event = parseEventData(eventInfo, currentDate, sourceFile);
          if (event) {
            events.push(event);
            console.log(`    ✅ Created: ${event.title}`);
          }

          // Move to next position
          i = j;
        } else {
          // This line doesn't contain a sport, skip it
          console.log(`    ⏭️  Skipping non-event line: "${eventLine}"`);
          i++;
        }
      }
    } else {
      i++;
    }
  }

  console.log(
    `✅ Successfully parsed ${events.length} events from ${sourceFile}`
  );
  return events;
}

// Parse individual event data
function parseEventData(eventInfo, dateStr, sourceFile) {
  try {
    const { eventLine, locationLines } = eventInfo;

    // Extract sport and game info
    let cleanLine = eventLine.trim();
    let sport = null;
    let isWomens = false;
    let isMens = false;

    // Check for Men's or Women's prefix
    if (cleanLine.startsWith("Women's ")) {
      isWomens = true;
      cleanLine = cleanLine.substring(8);
    } else if (cleanLine.startsWith("Men's ")) {
      isMens = true;
      cleanLine = cleanLine.substring(6);
    }

    // Extract sport
    const sportMatch = cleanLine.match(
      /^(Soccer|Football|Volleyball|Field Hockey|Basketball|Hockey|Baseball|Softball|Tennis|Golf|Track|Cross Country|Wrestling|Gymnastics|Swimming|Diving)/i
    );

    if (!sportMatch) {
      return null;
    }

    sport = sportMatch[1];
    cleanLine = cleanLine.substring(sport.length).trim();

    // Standardize sport name
    const sportKey =
      (isWomens ? "women's " : isMens ? "men's " : "") + sport.toLowerCase();
    const standardizedSport =
      SPORT_MAPPING[sportKey] || SPORT_MAPPING[sport.toLowerCase()] || sport;

    // Extract time first
    let gameTime = "TBA";
    const timeMatch = cleanLine.match(
      /(\d+(?::\d+)?\s*(?:AM|PM|A\.M\.|P\.M\.))/i
    );
    if (timeMatch) {
      gameTime = timeMatch[1];
      cleanLine = cleanLine.replace(timeMatch[0], "").trim();
    } else if (cleanLine.includes("TBA")) {
      gameTime = "TBA";
      cleanLine = cleanLine.replace(/TBA/g, "").trim();
    }

    // Parse opponent and game type
    let opponent = null;
    let isHomeGame = true;
    let title = "";

    // Check for vs (home) or at (away)
    if (cleanLine.startsWith("vs ")) {
      opponent = cleanLine.substring(3).trim();
      isHomeGame = true;
      title = `${standardizedSport} vs ${opponent}`;
    } else if (cleanLine.startsWith("at ")) {
      opponent = cleanLine.substring(3).trim();
      isHomeGame = false;
      title = `${standardizedSport} at ${opponent}`;
    } else {
      return null;
    }

    // Clean up opponent name
    opponent = opponent.replace(/\s*\(.*?\).*$/, "").trim();
    opponent = opponent.replace(/\s*(TBA|AM|PM|A\.M\.|P\.M\.).*$/, "").trim();

    // Check for exhibition
    if (eventLine.includes("Exhibition")) {
      title += " (Exhibition)";
    }

    // Process location
    let location = isHomeGame ? "East Lansing, MI" : null;
    let venue = null;

    if (locationLines.length > 0) {
      for (const locLine of locationLines) {
        if (
          locLine.includes("Stadium") ||
          locLine.includes("Center") ||
          locLine.includes("Arena") ||
          locLine.includes("Field")
        ) {
          venue = locLine;
        } else {
          location = locLine
            .replace("Mich.", "MI")
            .replace("Michigan", "MI")
            .replace("Ohio", "OH");
        }
      }
    }

    // College ID assignment
    let homeCollegeId = null;
    let awayCollegeId = null;

    if (isHomeGame) {
      homeCollegeId = MSU_COLLEGE_ID; // MSU is home
      // awayCollegeId would be opponent's ID if we had it
    } else {
      awayCollegeId = MSU_COLLEGE_ID; // MSU is away
      // homeCollegeId would be opponent's ID if we had it
    }

    // Create event
    const event = {
      title: title,
      description: `${title}${gameTime !== "TBA" ? ` - ${gameTime}` : ""}`,
      event_date: combineDateTime(dateStr, gameTime),
      location: location || "TBA",
      venue: venue,
      sport: standardizedSport,
      opponent: opponent,
      game_time: gameTime,
      is_home_game: isHomeGame,
      home_team: isHomeGame ? "Michigan State" : opponent,
      away_team: isHomeGame ? opponent : "Michigan State",
      college_id: MSU_COLLEGE_ID, // Always MSU for this import
      home_college_id: homeCollegeId,
      away_college_id: awayCollegeId,
      status: "scraped",
      source: "parsed",
      external_id: generateExternalId(
        standardizedSport,
        dateStr,
        opponent,
        isHomeGame
      ),
      source_file: sourceFile,
    };

    return event;
  } catch (error) {
    console.error(`❌ Error parsing event:`, error);
    return null;
  }
}

// Generate external ID
function generateExternalId(sport, dateStr, opponent, isHomeGame) {
  const cleanDate = dateStr.replace(/[^a-zA-Z0-9]/g, "_");
  const cleanOpponent = opponent.replace(/[^a-zA-Z0-9]/g, "_");
  const gameType = isHomeGame ? "vs" : "at";
  return `${sport}_${cleanDate}_${gameType}_${cleanOpponent}_MSU`.toLowerCase();
}

// Combine date and time
function combineDateTime(dateStr, timeStr) {
  try {
    const baseDate = new Date(dateStr);

    if (isNaN(baseDate.getTime())) {
      console.warn(`⚠️  Invalid date: ${dateStr}`);
      return new Date().toISOString();
    }

    if (!timeStr || timeStr === "TBA") {
      baseDate.setHours(12, 0, 0, 0);
      return baseDate.toISOString();
    }

    const timeMatch = timeStr.match(
      /(\d+)(?::(\d+))?\s*(AM|PM|A\.M\.|P\.M\.)/i
    );
    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const meridiem = timeMatch[3].toUpperCase();

      if (meridiem.includes("PM") && hour !== 12) {
        hour += 12;
      } else if (meridiem.includes("AM") && hour === 12) {
        hour = 0;
      }

      baseDate.setHours(hour, minute, 0, 0);
    } else {
      baseDate.setHours(12, 0, 0, 0);
    }

    return baseDate.toISOString();
  } catch (error) {
    console.error(
      `❌ Error combining date/time: ${dateStr}, ${timeStr}`,
      error
    );
    return new Date().toISOString();
  }
}

// Check for duplicates
async function checkDuplicateEvents(events) {
  const filteredEvents = [];
  console.log(`🔍 Checking for duplicates among ${events.length} events...`);

  for (const event of events) {
    try {
      const { data: existingEvent } = await supabase
        .from("events")
        .select("id, title")
        .eq("external_id", event.external_id)
        .single();

      if (existingEvent) {
        console.log(`⚠️  Duplicate found: ${event.title}`);
        continue;
      }

      filteredEvents.push(event);
    } catch (error) {
      // No duplicate found
      filteredEvents.push(event);
    }
  }

  console.log(
    `✅ After duplicate check: ${filteredEvents.length} events remain`
  );
  return filteredEvents;
}

// Insert events
async function insertEvents(events) {
  let successCount = 0;
  let errorCount = 0;

  console.log(`📥 Inserting ${events.length} events into database...`);

  for (const event of events) {
    try {
      const { data, error } = await supabase
        .from("events")
        .insert([event])
        .select();

      if (error) {
        console.error(`❌ Error inserting "${event.title}": ${error.message}`);
        errorCount++;
      } else {
        console.log(`✅ Inserted: ${event.title}`);
        successCount++;
      }
    } catch (error) {
      console.error(`💥 Unexpected error inserting "${event.title}":`, error);
      errorCount++;
    }
  }

  return { successCount, errorCount };
}

// Process directory
async function processDirectory(dirPath) {
  try {
    console.log(`\n📁 Processing directory: ${dirPath}`);

    const files = fs.readdirSync(dirPath);
    const txtFiles = files.filter((file) => file.endsWith(".txt"));

    if (txtFiles.length === 0) {
      console.log("❌ No .txt files found in the directory");
      return;
    }

    console.log(
      `📄 Found ${txtFiles.length} text file(s): ${txtFiles.join(", ")}`
    );

    let allEvents = [];

    for (const file of txtFiles) {
      const filePath = path.join(dirPath, file);
      console.log(`\n📖 Processing file: ${file}`);

      const content = fs.readFileSync(filePath, "utf8");
      const events = parseEvents(content, file);
      allEvents = allEvents.concat(events);
    }

    if (allEvents.length === 0) {
      console.log("⚠️  No events were parsed from the files");
      return;
    }

    // Check for duplicates and insert
    const filteredEvents = await checkDuplicateEvents(allEvents);
    const result = await insertEvents(filteredEvents);

    console.log(`\n🎉 Import completed!`);
    console.log(`   📝 Total events parsed: ${allEvents.length}`);
    console.log(`   🔄 After duplicate check: ${filteredEvents.length}`);
    console.log(`   ✅ Successfully inserted: ${result.successCount}`);
    console.log(`   ❌ Errors: ${result.errorCount}`);
  } catch (error) {
    console.error(`❌ Error processing directory:`, error.message);
  }
}

// Main execution
async function main() {
  const inputPath = process.argv[2];

  console.log(`🚀 MSU Event Import Script`);
  console.log(`========================`);

  if (!inputPath) {
    console.error(
      "Usage: node scripts/importEventsWorking.js <directory-path>"
    );
    console.error(
      "Example: node scripts/importEventsWorking.js ./calendar-data/msu"
    );
    process.exit(1);
  }

  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Path does not exist: ${inputPath}`);
    process.exit(1);
  }

  console.log(`📂 Input: ${inputPath}`);
  console.log(`🏫 College: Michigan State University (MSU)`);
  console.log(`🆔 College ID: ${MSU_COLLEGE_ID}\n`);

  await processDirectory(inputPath);
}

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  });
}

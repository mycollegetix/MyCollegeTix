// scripts/importEventsPurdue.js - Purdue Boilermakers Event Import Script
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

console.log("🔧 Starting Purdue import script...");

// Environment variables - SERVICE ROLE KEY for admin access (server-side only)
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials in .env file");
  console.error("Make sure you have SUPABASE_SERVICE_ROLE_KEY set");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Purdue College ID - you'll need to add Purdue to your COLLEGE_MAPPING
const PURDUE_COLLEGE_ID = "a7243fca-b72f-4551-8a1b-410cb7ec7512"; // Replace with actual Purdue UUID

// Sports mapping for consistency
const SPORT_MAPPING = {
  soccer: "Soccer",
  football: "Football",
  volleyball: "Volleyball",
  basketball: "Basketball",
  "men's basketball": "Basketball",
  "women's basketball": "Basketball",
  baseball: "Baseball",
  softball: "Softball",
  wrestling: "Wrestling",
  tennis: "Tennis",
  golf: "Golf",
  track: "Track & Field",
  "cross country": "Cross Country",
  swimming: "Swimming & Diving",
  gymnastics: "Gymnastics",
  hockey: "Hockey",
};

// Month abbreviation mapping
const MONTH_MAPPING = {
  JAN: "January",
  FEB: "February",
  MAR: "March",
  APR: "April",
  MAY: "May",
  JUN: "June",
  JUL: "July",
  AUG: "August",
  SEP: "September",
  OCT: "October",
  NOV: "November",
  DEC: "December",
};

// Parse events from Purdue format text content
function parseEvents(content, sourceFile) {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        !line.includes("All Sports Schedule") &&
        !line.includes("Official Athletics")
    );

  const events = [];
  let i = 0;

  console.log(`📄 Processing ${lines.length} lines from ${sourceFile}`);

  while (i < lines.length) {
    const line = lines[i];

    // Check for day abbreviation (MON, TUE, WED, etc.)
    const dayMatch = line.match(/^(MON|TUE|WED|THU|FRI|SAT|SUN)$/i);

    if (dayMatch && i + 1 < lines.length) {
      // Next line should be the date (AUG 6)
      const dateMatch = lines[i + 1].match(
        /^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d+)$/i
      );

      if (dateMatch) {
        const [, monthAbbr, day] = dateMatch;
        const currentDate = `${MONTH_MAPPING[monthAbbr]} ${day}, 2025`;
        console.log(`📅 Found date: ${currentDate}`);

        i += 2; // Skip day and date lines

        // Collect all lines for this event until we hit another day or end
        const eventLines = [];
        while (i < lines.length) {
          const eventLine = lines[i];

          // Stop if we hit another day abbreviation
          if (eventLine.match(/^(MON|TUE|WED|THU|FRI|SAT|SUN)$/i)) {
            break;
          }

          // Skip promotion lines and other noise
          if (
            eventLine.includes("Promotion Available") ||
            eventLine.includes("Expand for details") ||
            eventLine.includes("7/19/25") ||
            eventLine.includes("https://") ||
            eventLine.includes("PM All Sports Schedule")
          ) {
            i++;
            continue;
          }

          eventLines.push(eventLine);
          i++;
        }

        // Parse the collected event lines
        const event = parsePurdueEventData(eventLines, currentDate, sourceFile);
        if (event) {
          events.push(event);
          console.log(`    ✅ Created: ${event.title}`);
        }
      } else {
        i++;
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

// Parse individual Purdue event data
function parsePurdueEventData(eventLines, dateStr, sourceFile) {
  try {
    if (eventLines.length < 3) {
      return null; // Need at least opponent, location, sport
    }

    // First meaningful line should be the opponent (vs./at line)
    let opponentLine = null;
    let location = null;
    let venue = null;
    let gameTime = "TBA";
    let sport = null;
    let isExhibition = false;

    // Find the vs./at line
    for (let i = 0; i < eventLines.length; i++) {
      const line = eventLines[i];

      if (line.match(/^(vs\.|at)\s+/i)) {
        opponentLine = line;
        break;
      }
    }

    if (!opponentLine) {
      return null;
    }

    // Parse opponent and game type
    let opponent = null;
    let isHomeGame = true;
    let title = "";

    if (opponentLine.startsWith("vs.")) {
      opponent = opponentLine.substring(3).trim();
      isHomeGame = true;
    } else if (opponentLine.startsWith("at ")) {
      opponent = opponentLine.substring(3).trim();
      isHomeGame = false;
    }

    // Check for exhibition
    if (eventLines.some((line) => line.includes("EXHIBITION"))) {
      isExhibition = true;
    }

    // Find location line (contains " / " or ends with state abbreviation)
    // Make sure we don't confuse location with opponent line
    for (const line of eventLines) {
      // Skip the opponent line itself
      if (line === opponentLine) continue;

      if (line.includes(" / ")) {
        const locationParts = line.split(" / ");
        location = locationParts[0].trim();
        venue = locationParts[1].trim();
        break;
      } else if (
        line.match(/.*,\s+(Ind\.|Ohio|Mich\.|Calif\.|Tenn\.|Ga\.|Ky\.|etc)\.?$/)
      ) {
        location = line;
        break;
      }
    }

    // Find time line
    for (const line of eventLines) {
      const timeMatch = line.match(
        /(\d+:\d+\s*(?:AM|PM))\s*(?:EDT|EST|CDT|CST|MDT|MST|PDT|PST)?/i
      );
      if (timeMatch) {
        gameTime = timeMatch[1];
        break;
      }
    }

    // Find sport (usually the last meaningful line)
    for (let i = eventLines.length - 1; i >= 0; i--) {
      const line = eventLines[i];
      const sportMatch = line.match(
        /^(Soccer|Football|Volleyball|Basketball|Baseball|Wrestling|Tennis|Golf|Track|Swimming|Hockey|Men's Basketball|Women's Basketball)$/i
      );
      if (sportMatch) {
        sport = sportMatch[1];
        break;
      }
    }

    if (!sport || !opponent) {
      console.log(
        `    ⚠️  Could not parse sport or opponent from event lines:`,
        eventLines
      );
      return null;
    }

    // Standardize sport name
    const standardizedSport = SPORT_MAPPING[sport.toLowerCase()] || sport;

    // Create title
    if (isHomeGame) {
      title = `${standardizedSport} vs ${opponent}`;
    } else {
      title = `${standardizedSport} at ${opponent}`;
    }

    if (isExhibition) {
      title += " (Exhibition)";
    }

    // Handle special games (Trophy games, etc.)
    const trophyMatch = eventLines.find((line) => line.includes("Trophy"));
    if (trophyMatch) {
      title += ` - ${trophyMatch}`;
    }

    // Default location for home games
    if (isHomeGame && !location) {
      location = "West Lafayette, IN";
    }

    // College ID assignment
    let homeCollegeId = null;
    let awayCollegeId = null;

    if (isHomeGame) {
      homeCollegeId = PURDUE_COLLEGE_ID; // Purdue is home
    } else {
      awayCollegeId = PURDUE_COLLEGE_ID; // Purdue is away
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
      home_team: isHomeGame ? "Purdue" : opponent,
      away_team: isHomeGame ? opponent : "Purdue",
      college_id: PURDUE_COLLEGE_ID, // Always Purdue for this import
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
    console.error(`❌ Error parsing Purdue event:`, error);
    return null;
  }
}

// Generate external ID
function generateExternalId(sport, dateStr, opponent, isHomeGame) {
  const cleanDate = dateStr.replace(/[^a-zA-Z0-9]/g, "_");
  const cleanOpponent = opponent.replace(/[^a-zA-Z0-9]/g, "_");
  const gameType = isHomeGame ? "vs" : "at";
  return `${sport}_${cleanDate}_${gameType}_${cleanOpponent}_PURDUE`.toLowerCase();
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

    const timeMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      const minute = parseInt(timeMatch[2]);
      const meridiem = timeMatch[3].toUpperCase();

      if (meridiem === "PM" && hour !== 12) {
        hour += 12;
      } else if (meridiem === "AM" && hour === 12) {
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

  console.log(`🚀 Purdue Boilermakers Event Import Script`);
  console.log(`==========================================`);

  if (!inputPath) {
    console.error("Usage: node scripts/importEventsPurdue.js <directory-path>");
    console.error(
      "Example: node scripts/importEventsPurdue.js ./calendar-data/purdue"
    );
    process.exit(1);
  }

  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Path does not exist: ${inputPath}`);
    process.exit(1);
  }

  console.log(`📂 Input: ${inputPath}`);
  console.log(`🏫 College: Purdue University Boilermakers`);
  console.log(`🆔 College ID: ${PURDUE_COLLEGE_ID}\n`);

  await processDirectory(inputPath);
}

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  });
}

// scripts/importEventsFixed.js - MSU Athletics Event Import Script (FIXED VERSION)
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config(); // Load environment variables

//KEEP THIS IN HOW TO RUN THIS : node scripts/importEvents.js ./calendar-data

// Use your existing environment variables - SERVICE ROLE KEY for admin access
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials in .env file");
  console.error("Make sure you have:");
  console.error("  EXPO_PUBLIC_SUPABASE_URL=your_url_here");
  console.error(
    "  EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Sports mapping for consistency
const SPORT_MAPPING = {
  "women's soccer": "Soccer",
  "men's soccer": "Soccer",
  soccer: "Soccer",
  "field hockey": "Field Hockey",
  volleyball: "Volleyball",
  football: "Football",
  "men's football": "Football", // Add this line
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

// Venue mapping for location consistency
const VENUE_MAPPING = {
  "demartin stadium": "DeMartin Stadium",
  "spartan stadium": "Spartan Stadium",
  "breslin center": "Breslin Center",
  "breslin student events center": "Breslin Center",
  "ralph young field": "Ralph Young Field",
  "munn ice arena": "Munn Ice Arena",
  "jenison field house": "Jenison Field House",
  "east lansing, mich.": "East Lansing, MI",
  "east lansing, michigan": "East Lansing, MI",
  "east lansing, mi": "East Lansing, MI",
};

function parseEventFile(filePath) {
  console.log(`📖 Reading file: ${path.basename(filePath)}`);

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line);

  const events = [];
  let currentDate = null;
  let i = 0;

  // Skip header lines until we find a date
  while (i < lines.length && !lines[i].match(/^\w+day,/)) {
    i++;
  }

  while (i < lines.length) {
    const line = lines[i];

    // Check if this is a date line (e.g., "Saturday, August 9, 2025")
    const dateMatch = line.match(/^(\w+day),\s+(.+)/);
    if (dateMatch) {
      currentDate = parseDate(dateMatch[2]);
      console.log(`📅 Found date: ${dateMatch[2]} → ${currentDate}`);
      i++;
      continue;
    }

    // Check if this is an event line
    if (
      currentDate &&
      line &&
      !line.match(/^\w+day,/) &&
      !line.includes("**") &&
      !line.includes("Composite Calendar") &&
      !line.startsWith("-")
    ) {
      // Look ahead to gather location/venue info
      const eventLines = [line];
      let j = i + 1;

      // Collect lines until we hit the next event or date
      while (j < lines.length) {
        const nextLine = lines[j];

        // Stop if we hit another date
        if (nextLine.match(/^\w+day,/)) {
          break;
        }

        // Stop if we hit another event (contains sport name)
        if (
          nextLine.match(
            /^(Women's |Men's )?(Soccer|Football|Volleyball|Field Hockey|Basketball|Hockey|Baseball|Softball)/i
          )
        ) {
          break;
        }

        // Skip lines that start with '-' (tournament names, etc.)
        if (nextLine.startsWith("-")) {
          j++;
          continue;
        }

        // Add location/venue lines
        if (nextLine) {
          eventLines.push(nextLine);
        }

        j++;
      }

      // Parse the collected event data
      const event = parseEventLines(
        eventLines,
        currentDate,
        path.basename(filePath)
      );
      if (event) {
        events.push(event);
        console.log(`  ⚽ Parsed: ${event.title}`);
      }

      // Move to the next event
      i = j;
      continue;
    }

    i++;
  }

  return events;
}

function parseEventLines(eventLines, date, sourceFile) {
  try {
    const eventLine = eventLines[0];
    console.log(`  🔍 Parsing event: "${eventLine}"`);

    if (eventLines.length > 1) {
      console.log(`    📍 Location info: ${eventLines.slice(1).join(", ")}`);
    }

    // Clean the line and extract sport
    let cleanLine = eventLine;
    let sport = null;
    let isWomens = false;
    let isMens = false;

    // Check for Men's or Women's prefix
    if (cleanLine.startsWith("Women's ")) {
      isWomens = true;
      cleanLine = cleanLine.substring(8); // Remove "Women's "
    } else if (cleanLine.startsWith("Men's ")) {
      isMens = true;
      cleanLine = cleanLine.substring(6); // Remove "Men's "
    }

    // Extract sport from the beginning
    const sportMatch = cleanLine.match(
      /^(Soccer|Football|Volleyball|Field Hockey|Basketball|Hockey|Baseball|Softball|Tennis|Golf|Track|Cross Country|Wrestling|Gymnastics|Swimming|Diving)/i
    );
    if (!sportMatch) {
      console.log(`  ⚠️  No recognized sport found in: "${eventLine}"`);
      return null;
    }

    const sportKey =
      (isWomens ? "women's " : isMens ? "men's " : "") +
      sportMatch[1].toLowerCase();
    sport =
      SPORT_MAPPING[sportKey] ||
      SPORT_MAPPING[sportMatch[1].toLowerCase()] ||
      sportMatch[1];
    cleanLine = cleanLine.substring(sportMatch[1].length).trim();

    console.log(
      `    🔍 After removing sport "${sportMatch[1]}", cleanLine: "${cleanLine}"`
    );

    // Parse different event formats
    let opponent = null;
    let location = "East Lansing, MI";
    let venue = null;
    let gameTime = null;
    let isHomeGame = true;
    let title = "";

    // Extract time from the event line first
    const timeMatch = cleanLine.match(
      /(\d+(?::\d+)?\s*(?:AM|PM|P\.M\.|A\.M\.))/i
    );
    if (timeMatch) {
      gameTime = parseTime(timeMatch[1]);
      cleanLine = cleanLine.replace(timeMatch[0], "").trim();
      console.log(
        `    ⏰ Found time "${timeMatch[1]}" -> "${gameTime}", cleanLine now: "${cleanLine}"`
      );
    } else if (cleanLine.includes("TBA")) {
      gameTime = "TBA";
      cleanLine = cleanLine.replace(/TBA/g, "").trim();
      console.log(`    ⏰ Found TBA, cleanLine now: "${cleanLine}"`);
    }

    // Handle "vs" games (home games)
    if (cleanLine.startsWith("vs ")) {
      opponent = cleanLine.substring(3).trim(); // Remove "vs " from the beginning

      // Remove any time info that might be at the end
      if (gameTime) {
        opponent = opponent
          .replace(/\s*(TBA|\d+(?::\d+)?\s*(?:AM|PM|P\.M\.|A\.M\.))/gi, "")
          .trim();
      }

      // Check if it's an exhibition
      const isExhibition =
        eventLine.includes("Exhibition") || eventLine.includes("exhibition");

      title = `${sport} vs ${opponent}${isExhibition ? " (Exhibition)" : ""}`;
      isHomeGame = true;

      // Process location lines
      if (eventLines.length > 1) {
        const locationLines = eventLines.slice(1);

        // First location line might be city/state, second might be venue
        if (locationLines.length === 2) {
          location = locationLines[0];
          venue = locationLines[1];
        } else if (locationLines.length === 1) {
          // Could be either venue or location
          const locationLine = locationLines[0];
          if (
            locationLine.includes("Stadium") ||
            locationLine.includes("Center") ||
            locationLine.includes("Field") ||
            locationLine.includes("Arena")
          ) {
            venue = locationLine;
            location = "East Lansing, MI"; // Default for home games
          } else {
            location = locationLine;
          }
        }
      }
    }
    // Handle "at" games (away games)
    else if (cleanLine.startsWith("at ")) {
      opponent = cleanLine.substring(3).trim(); // Remove "at " from the beginning

      // Remove any time info that might be at the end
      if (gameTime) {
        opponent = opponent
          .replace(/\s*(TBA|\d+(?::\d+)?\s*(?:AM|PM|P\.M\.|A\.M\.))/gi, "")
          .trim();
      }

      // Check if it's an exhibition
      const isExhibition =
        eventLine.includes("Exhibition") || eventLine.includes("exhibition");

      title = `${sport} at ${opponent}${isExhibition ? " (Exhibition)" : ""}`;
      isHomeGame = false;
      venue = null; // Away games don't have our venue

      // Process location lines for away games
      if (eventLines.length > 1) {
        location = eventLines[1]; // Use the location line
      } else {
        location = opponent; // Fallback to opponent name
      }
    }
    // Handle special case: "Volleyball Appalachian State 2 PM" (missing vs/at)
    else {
      // Try to extract opponent name from what's left
      let remainingText = cleanLine.trim();

      // Remove time if present
      if (gameTime) {
        remainingText = remainingText
          .replace(/\s*(TBA|\d+(?::\d+)?\s*(?:AM|PM|P\.M\.|A\.M\.))/gi, "")
          .trim();
      }

      if (remainingText) {
        opponent = remainingText;
        // Default to home game if no clear indicator
        title = `${sport} vs ${opponent}`;
        isHomeGame = true;

        // Process location lines
        if (eventLines.length > 1) {
          const locationLines = eventLines.slice(1);
          if (locationLines.length >= 1) {
            const firstLocation = locationLines[0];
            // If the first location looks like a venue, use it
            if (
              firstLocation.includes("Stadium") ||
              firstLocation.includes("Center") ||
              firstLocation.includes("Field") ||
              firstLocation.includes("Arena")
            ) {
              venue = firstLocation;
              location = "East Lansing, MI";
            } else {
              location = firstLocation;
              if (locationLines.length > 1) {
                venue = locationLines[1];
              }
            }
          }
        }
      }
    }

    // Debug: Let's see what we're creating
    console.log(`    🎯 Created title: "${title}"`);
    console.log(`    🏟️  Opponent: "${opponent}"`);
    console.log(`    🏠 Home game: ${isHomeGame}`);

    // If we couldn't parse it, skip
    if (!opponent) {
      console.log(`  ⚠️  Could not parse event format: "${eventLine}"`);
      return null;
    }

    // Clean up venue and location
    if (venue) {
      venue = VENUE_MAPPING[venue.toLowerCase()] || venue;
    }
    if (location) {
      location = VENUE_MAPPING[location.toLowerCase()] || location;
    }

    // Create the event object
    const event = {
      title: title,
      description: `${sport} game on ${date}${opponent ? ` - ${title}` : ""}`,
      event_date: combineDateTime(date, gameTime),
      location: location || "East Lansing, MI",
      venue: venue,
      sport: sport,
      opponent: opponent,
      game_time: gameTime,
      is_home_game: isHomeGame,
      home_team: isHomeGame ? "Michigan State" : opponent,
      away_team: isHomeGame ? opponent : "Michigan State",
      status: "available",
      source: "parsed",
      source_file: sourceFile,
    };

    return event;
  } catch (error) {
    console.error("❌ Error parsing event lines:", eventLines, error);
    return null;
  }
}

function parseDate(dateStr) {
  try {
    // Handle formats like "August 9, 2025"
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      console.warn(`⚠️  Could not parse date: ${dateStr}`);
      return null;
    }
    return date.toISOString().split("T")[0]; // Return YYYY-MM-DD format
  } catch (error) {
    console.error("❌ Error parsing date:", dateStr);
    return null;
  }
}

function parseTime(timeStr) {
  if (!timeStr || timeStr.toUpperCase().includes("TBA")) {
    return "TBA";
  }

  // Handle formats like "7 P.M.", "7:30 PM", "12 PM", etc.
  const timeMatch = timeStr.match(/(\d+)(?::(\d+))?\s*(AM|PM|A\.M\.|P\.M\.)/i);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1]);
    const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const period = timeMatch[3].toUpperCase();

    if (period.includes("PM") && hour !== 12) {
      hour += 12;
    } else if (period.includes("AM") && hour === 12) {
      hour = 0;
    }

    return `${hour.toString().padStart(2, "0")}:${minute
      .toString()
      .padStart(2, "0")}`;
  }

  return timeStr;
}

function combineDateTime(date, time) {
  if (!time || time === "TBA") {
    // Default to 3:00 PM for events without specific time
    return `${date}T15:00:00-05:00`; // EST timezone
  }

  const [hour, minute] = time.split(":");
  return `${date}T${hour}:${minute}:00-05:00`; // EST timezone
}

async function checkForDuplicates(event) {
  try {
    // Check for duplicates using multiple criteria to be more thorough
    const { data: existingEvents } = await supabase
      .from("events")
      .select("id, title, event_date, location, opponent, sport")
      .or(
        `and(title.eq.${event.title},event_date.eq.${event.event_date}),and(opponent.eq.${event.opponent},event_date.eq.${event.event_date},sport.eq.${event.sport})`
      )
      .limit(5);

    if (existingEvents && existingEvents.length > 0) {
      console.log(
        `    🔍 Found ${existingEvents.length} potential duplicate(s):`
      );
      existingEvents.forEach((existing) => {
        console.log(`      - "${existing.title}" on ${existing.event_date}`);
      });
      return true;
    }

    return false;
  } catch (error) {
    console.error("❌ Error checking for duplicates:", error.message);

    // Fallback: simple title and date check
    try {
      const { data: simpleCheck } = await supabase
        .from("events")
        .select("id")
        .eq("title", event.title)
        .eq("event_date", event.event_date)
        .maybeSingle();

      return simpleCheck !== null;
    } catch (fallbackError) {
      console.error(
        "❌ Fallback duplicate check also failed:",
        fallbackError.message
      );
      return false;
    }
  }
}

async function cleanupExistingDuplicates() {
  console.log("\n🧹 Checking for existing duplicates in database...");

  try {
    // Get all events grouped by title and date to find duplicates
    const { data: allEvents } = await supabase
      .from("events")
      .select("id, title, event_date, created_at")
      .order("created_at", { ascending: true });

    if (!allEvents || allEvents.length === 0) {
      console.log("📋 No existing events found in database.");
      return;
    }

    // Group events by title + date to find duplicates
    const eventGroups = {};
    allEvents.forEach((event) => {
      const key = `${event.title}|||${event.event_date}`;
      if (!eventGroups[key]) {
        eventGroups[key] = [];
      }
      eventGroups[key].push(event);
    });

    // Find groups with duplicates
    const duplicateGroups = Object.values(eventGroups).filter(
      (group) => group.length > 1
    );

    if (duplicateGroups.length === 0) {
      console.log("✅ No duplicates found in existing events.");
      return;
    }

    console.log(
      `🔍 Found ${duplicateGroups.length} groups of duplicate events:`
    );

    let deletedCount = 0;
    for (const group of duplicateGroups) {
      console.log(`\n  📅 "${group[0].title}" on ${group[0].event_date}:`);
      console.log(
        `    Found ${group.length} duplicates, keeping the oldest one...`
      );

      // Keep the first (oldest) event, delete the rest
      const toDelete = group.slice(1);

      for (const event of toDelete) {
        const { error } = await supabase
          .from("events")
          .delete()
          .eq("id", event.id);

        if (error) {
          console.error(
            `    ❌ Error deleting duplicate ${event.id}:`,
            error.message
          );
        } else {
          console.log(`    🗑️  Deleted duplicate: ${event.id}`);
          deletedCount++;
        }
      }
    }

    console.log(
      `\n🧹 Cleanup complete: Removed ${deletedCount} duplicate events.`
    );
  } catch (error) {
    console.error("❌ Error during duplicate cleanup:", error.message);
  }
}

async function importEvents(events) {
  console.log(`\n🚀 Starting import of ${events.length} events...`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const event of events) {
    try {
      // Check for duplicates
      const isDuplicate = await checkForDuplicates(event);

      if (isDuplicate) {
        console.log(
          `⏭️  Skipping duplicate: ${event.title} on ${
            event.event_date.split("T")[0]
          }`
        );
        skipped++;
        continue;
      }

      // Insert the event
      const { data, error } = await supabase
        .from("events")
        .insert(event)
        .select()
        .single();

      if (error) {
        console.error(`❌ Error inserting "${event.title}":`, error.message);
        errors++;
      } else {
        console.log(
          `✅ Imported: ${event.title} - ${event.event_date.split("T")[0]}`
        );
        imported++;
      }
    } catch (error) {
      console.error(`❌ Error processing "${event.title}":`, error.message);
      errors++;
    }
  }

  console.log(`\n📊 Import Summary:`);
  console.log(`✅ Successfully imported: ${imported} events`);
  console.log(`⏭️  Skipped duplicates: ${skipped} events`);
  console.log(`❌ Errors: ${errors} events`);

  if (imported > 0) {
    console.log(
      `\n🎉 Success! ${imported} events are now available in your sell tab dropdown.`
    );
  }
}

async function processFolder(folderPath) {
  try {
    console.log(`📁 Processing folder: ${folderPath}`);

    const files = fs.readdirSync(folderPath);
    const txtFiles = files.filter((file) => file.endsWith(".txt"));

    if (txtFiles.length === 0) {
      console.log("❌ No .txt files found in the folder.");
      console.log("📝 Make sure your calendar files have .txt extension");
      return;
    }

    console.log(
      `📄 Found ${txtFiles.length} text file(s): ${txtFiles.join(", ")}`
    );

    let allEvents = [];

    for (const file of txtFiles) {
      const filePath = path.join(folderPath, file);
      console.log(`\n📖 Processing: ${file}`);

      try {
        const events = parseEventFile(filePath);
        console.log(`✅ Parsed ${events.length} events from ${file}`);
        allEvents = allEvents.concat(events);
      } catch (error) {
        console.error(`❌ Error processing file ${file}:`, error.message);
      }
    }

    if (allEvents.length > 0) {
      console.log(`\n📋 Total events parsed: ${allEvents.length}`);

      // Clean up existing duplicates first
      await cleanupExistingDuplicates();

      // Then import new events
      await importEvents(allEvents);
    } else {
      console.log("❌ No events were parsed from the files.");
      console.log("📝 Check that your text files follow the correct format.");
    }
  } catch (error) {
    console.error("❌ Error processing folder:", error.message);
  }
}

// Main execution
if (require.main === module) {
  const folderPath = process.argv[2];

  console.log("🏈 MSU Athletics Event Import Script - FIXED VERSION");
  console.log("====================================================");

  if (!folderPath) {
    console.log("❌ Usage: node scripts/importEventsFixed.js <folder-path>");
    console.log(
      "📝 Example: node scripts/importEventsFixed.js ./calendar-data"
    );
    process.exit(1);
  }

  if (!fs.existsSync(folderPath)) {
    console.error(`❌ Folder does not exist: ${folderPath}`);
    console.log("📁 Create the folder and add your .txt files there");
    process.exit(1);
  }

  console.log(`🔗 Connected to Supabase: ${supabaseUrl}`);
  processFolder(folderPath);
}

module.exports = { parseEventFile, importEvents, processFolder };

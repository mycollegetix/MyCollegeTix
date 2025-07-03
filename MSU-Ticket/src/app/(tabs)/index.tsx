import { StyleSheet, FlatList } from "react-native";
import { Text, View } from "@/src/components/Themed";
import { TicketCard } from "@/src/components/TicketCard";

interface Ticket {
  id: string;
  sport: string;
  event: string;
  date: string;
  price: number;
  section: string;
  row: string;
  seat: string;
}

// Sample data - we'll replace this with real data from Supabase later
const sampleTickets: Ticket[] = [
  {
    id: "1",
    sport: "Football",
    event: "MSU vs Michigan",
    date: "Oct 21, 2024 • 7:30 PM",
    price: 150.0,
    section: "25",
    row: "G",
    seat: "12",
  },
  {
    id: "2",
    sport: "Basketball",
    event: "MSU vs Ohio State",
    date: "Nov 15, 2024 • 8:00 PM",
    price: 75.0,
    section: "118",
    row: "C",
    seat: "5",
  },
  {
    id: "3",
    sport: "Hockey",
    event: "MSU vs Notre Dame",
    date: "Dec 5, 2024 • 6:00 PM",
    price: 45.0,
    section: "8",
    row: "K",
    seat: "15",
  },
];

export default function BrowseScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <Text style={styles.filterText}>All Sports</Text>
      </View>
      <FlatList<Ticket>
        data={sampleTickets}
        renderItem={({ item }) => (
          <TicketCard
            sport={item.sport}
            event={item.event}
            date={item.date}
            price={item.price}
            section={item.section}
            row={item.row}
            seat={item.seat}
            onPress={() => {
              // We'll implement ticket details navigation later
              console.log("Ticket pressed:", item.id);
            }}
          />
        )}
        keyExtractor={(item: Ticket) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterContainer: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  filterText: {
    fontSize: 16,
    fontWeight: "600",
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 15,
  },
});

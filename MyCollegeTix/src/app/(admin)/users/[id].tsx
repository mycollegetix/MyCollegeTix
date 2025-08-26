import { Stack, useLocalSearchParams } from 'expo-router';
import { Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { useEffect, useState } from 'react';
import { Tables } from '@/src/types/database.types';

type Profile = Tables<'profiles'>;

export default function UserDetailsPage() {
  const { id } = useLocalSearchParams();
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Tables<'tickets'>[]>([]);
  const [conversations, setConversations] = useState<Tables<'conversations'>[]>([]);

  useEffect(() => {
    const userId = Array.isArray(id) ? id[0] : id;

    const fetchUser = async () => {
      if (!userId) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) throw error;
        setUser(data);
      } catch (error) {
        console.error('Error fetching user details:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchTickets = async () => {
      if (!userId) return;
      try {
        const { data, error } = await supabase
          .from('tickets')
          .select('*')
          .eq('seller_id', userId);

        if (error) throw error;
        setTickets(data);
      } catch (error) {
        console.error('Error fetching tickets:', error);
      }
    };

    const fetchConversations = async () => {
      if (!userId) return;
      try {
        const { data, error } = await supabase
          .from('conversations')
          .select('*')
          .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`);

        if (error) throw error;
        setConversations(data);
      } catch (error) {
        console.error('Error fetching conversations:', error);
      }
    };

    fetchUser();
    fetchTickets();
    fetchConversations();
  }, [id]);

  if (loading) {
    return <ActivityIndicator />;
  }

  if (!user) {
    return <Text>User not found</Text>;
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: user.full_name || 'User Details' }} />
      <View style={styles.header}>
        <Text style={styles.name}>{user.full_name}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{tickets.length}</Text>
          <Text style={styles.statLabel}>Tickets Posted</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{conversations.length}</Text>
          <Text style={styles.statLabel}>Conversations</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{user.current_ip_address || 'N/A'}</Text>
          <Text style={styles.statLabel}>IP Address</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  email: {
    fontSize: 16,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
});
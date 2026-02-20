import { View, Text, Button } from 'react-native';
import { supabase } from '../../constants/supabase';

export default function Home() {
  return (
    <View style={{ padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '600' }}>You’re in ✅</Text>
      <Button title="Sign out" onPress={() => supabase.auth.signOut()} />
    </View>
  );
}
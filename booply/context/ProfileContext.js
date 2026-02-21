import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../constants/supabase";

const ProfileContext = createContext();

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    setEmail(user?.email ?? "");

    if (user?.id) {
      const { data } = await supabase
        .from("profiles")
        .select("first_name,last_name,description,preferences")
        .eq("user_id", user.id)
        .single();
      setProfile(data);
    } else {
      setProfile(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();

    // Listen for auth changes (login, logout, session refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchProfile();
    });

    return () => subscription?.unsubscribe();
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, email, loading }}>
      {children}
    </ProfileContext.Provider>
  );
}

export const useProfile = () => useContext(ProfileContext);
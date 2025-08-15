import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

export const useCleaners = () => {
  const { supabase } = useAuth();
  const [cleaners, setCleaners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCleaners();
  }, []);

  const fetchCleaners = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all cleaners
      const { data: cleanerRoles, error: rolesError } = await supabase
        .from("roles")
        .select("user_id")
        .eq("role", "cleaner")
        .order("created_at");

      if (rolesError) throw rolesError;

      if (!cleanerRoles || cleanerRoles.length === 0) {
        setCleaners([]);
        return;
      }

      // Get their profile information
      const { data: profiles, error: profilesError } = await supabase
        .from("user_profiles")
        .select("id, name, email")
        .in("id", cleanerRoles.map(r => r.user_id));

      if (profilesError) throw profilesError;

      // Format for dropdown use
      const formattedCleaners = profiles?.map(profile => ({
        id: profile.id,
        name: profile.name || profile.email || `User ${profile.id.substring(0, 8)}...`,
        email: profile.email
      })) || [];

      setCleaners(formattedCleaners);
    } catch (err) {
      console.error("Error fetching cleaners:", err);
      setError(err.message);
      setCleaners([]);
    } finally {
      setLoading(false);
    }
  };

  return { cleaners, loading, error, refetch: fetchCleaners };
};
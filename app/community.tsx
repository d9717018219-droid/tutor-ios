import React, { useState, useMemo } from 'react';
import {
  FlatList, Linking, Platform, Pressable, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CITIES = [
  { name: "Ahmedabad",      emoji: "🏭", link: "https://chat.whatsapp.com/GqtUV3RCmN1JWRby5bB0c1" },
  { name: "Ajmer",          emoji: "🕍", link: "https://chat.whatsapp.com/EP5E3PvLod2GchGXtdESy7" },
  { name: "Amritsar",       emoji: "📀", link: "https://chat.whatsapp.com/H35neXyghCxLiR4jfZ0q2o" },
  { name: "Anand",          emoji: "🥛", link: "https://chat.whatsapp.com/F1kfy9h060LBmjQFLzG94R" },
  { name: "Armoor",         emoji: "🏙️", link: "https://chat.whatsapp.com/CRsCX5xtU081UyLl0oTSJv" },
  { name: "Aurangabad",     emoji: "🏛️", link: "https://chat.whatsapp.com/HaSe394O9a4AzUGsEapdoj" },
  { name: "Bangalore",      emoji: "💡", link: "https://chat.whatsapp.com/IPPHXsc5UsgIjZcvJI7oQP" },
  { name: "Bareilly",       emoji: "🏙️", link: "https://chat.whatsapp.com/G2G5ptgVKuI8mWdxqu8fDU" },
  { name: "Belagavi",       emoji: "🏛️", link: "https://chat.whatsapp.com/GtjRd73BqQdJzM0mxDPxTL" },
  { name: "Belgaum",        emoji: "🏭", link: "https://chat.whatsapp.com/Ir5zeBxrlKIAgbT5EqMFur" },
  { name: "Bhilai",         emoji: "🏗️", link: "https://chat.whatsapp.com/EBHB1Ydr4uw4PhNGzedTQi" },
  { name: "Bhilwara",       emoji: "👕", link: "https://chat.whatsapp.com/BJUafdJub8v4OQMAUc7QhN" },
  { name: "Bhiwadi",        emoji: "🏙️", link: "https://chat.whatsapp.com/BjghnofxSbbC53fLJ3SIFZ" },
  { name: "Bhopal",         emoji: "🛶", link: "https://chat.whatsapp.com/LoNL85qcqrz8zTi0gRi48y" },
  { name: "Bhubaneswar",    emoji: "🛕", link: "https://chat.whatsapp.com/BrPeiSStTkvGAJRul15piQ" },
  { name: "Bilaspur",       emoji: "🏙️", link: "https://chat.whatsapp.com/CBPQ5TUeEKpH7bAdwUWh3d" },
  { name: "Bokaro",         emoji: "⛓️", link: "https://chat.whatsapp.com/FjAsQWdQJOo3VbUQixnloR" },
  { name: "Burdwan",        emoji: "🌾", link: "https://chat.whatsapp.com/IkantzS33Ho3JEe2tXYyEL" },
  { name: "Chandigarh",     emoji: "🌳", link: "https://chat.whatsapp.com/CyBrMkx6VZE5ixCoAsSbBt" },
  { name: "Chennai",        emoji: "🌊", link: "https://chat.whatsapp.com/JsS90qP6I3qLobWOU5lyvY" },
  { name: "Coimbatore",     emoji: "🏭", link: "https://chat.whatsapp.com/H8I1QdxhHWoLNWlZBTjSDT" },
  { name: "Cuttack",        emoji: "🏙️", link: "https://chat.whatsapp.com/ItcU9oOo1kz9KF22HOilCJ" },
  { name: "Dehradun",       emoji: "⛰️", link: "https://chat.whatsapp.com/LtZHD4LonoB95YyXoaTZmi" },
  { name: "Delhi",          emoji: "🏛️", link: "https://chat.whatsapp.com/BD63d9E4U0m4nTF06khGJx" },
  { name: "Dhanbad",        emoji: "💎", link: "https://chat.whatsapp.com/JbIFyIeMyMX15elX7Zl2en" },
  { name: "Dharwad",        emoji: "🏛️", link: "https://chat.whatsapp.com/LueenX7n9hzG1KaUBN9gVJ" },
  { name: "Faridabad",      emoji: "🛣️", link: "https://chat.whatsapp.com/GvkHCe6M4jrGLmdq92yHu1" },
  { name: "Gandhinagar",    emoji: "🏛️", link: "https://chat.whatsapp.com/Fw6HIIazIKo8nNTCobB7W0" },
  { name: "Gangtok",        emoji: "🏔️", link: "https://chat.whatsapp.com/CJPAKcqZutD1rr2ujodFEA" },
  { name: "Ghaziabad",      emoji: "🏙️", link: "https://chat.whatsapp.com/LmhaONf0zTAGjbvngkN1HU" },
  { name: "Goa",            emoji: "🏖️", link: "https://chat.whatsapp.com/Hxn9THh3geH8xM4lgtHURO" },
  { name: "Gorakhpur",      emoji: "🛕", link: "https://chat.whatsapp.com/EqqCcZ9evfP1RygGKECuQu" },
  { name: "Greater Noida",  emoji: "🏘️", link: "https://chat.whatsapp.com/J0hngwZd66cEU7Y0DdlrN9" },
  { name: "Gulbarga",       emoji: "🏰", link: "https://chat.whatsapp.com/EPDfymkMmXDClKO5PUafyS" },
  { name: "Guntur",         emoji: "🌶️", link: "https://chat.whatsapp.com/HDs7kraRdQyFtAvlkdDugY" },
  { name: "Gurgaon",        emoji: "💼", link: "https://chat.whatsapp.com/LUewyGOqM004tUOdmksIS9" },
  { name: "Guwahati",       emoji: "⛴️", link: "https://chat.whatsapp.com/LXbALnu4mB7JCPlGg4ZJVL" },
  { name: "Gwalior",        emoji: "🏯", link: "https://chat.whatsapp.com/BiJLjh0HPgR3pEUBsy8cCC" },
  { name: "Howrah",         emoji: "🌉", link: "https://chat.whatsapp.com/KWVSM9sgno95kkF92gLvgF" },
  { name: "Hyderabad",      emoji: "🕌", link: "https://chat.whatsapp.com/GgDN6xyVhW3KzWQ9GiGcmV" },
  { name: "Indore",         emoji: "🌾", link: "https://chat.whatsapp.com/I0AN6AU5YVh1l7GVeGzidP" },
  { name: "Jabalpur",       emoji: "🌊", link: "https://chat.whatsapp.com/DHrH9TOhOJmDTbX8peXIzI" },
  { name: "Jaipur",         emoji: "🌸", link: "https://chat.whatsapp.com/ICU8v4ZzgZa9EwHm2bHzBG" },
  { name: "Jalandhar",      emoji: "🏗️", link: "https://chat.whatsapp.com/B9kl2XWK3F05bdKCTExsCC" },
  { name: "Jalgaon",        emoji: "🍌", link: "https://chat.whatsapp.com/CFakHbDfVAj8XmHxbZp9dn" },
  { name: "Jammu",          emoji: "🏔️", link: "https://chat.whatsapp.com/G6AQYNNrkWvFEenwIM0bvu" },
  { name: "Jamnagar",       emoji: "💎", link: "https://chat.whatsapp.com/BU7xU9i2By1HWJiT03DWWG" },
  { name: "Jodhpur",        emoji: "🏜️", link: "https://chat.whatsapp.com/Cq74zSAY8wpD4loJC89xja" },
  { name: "Jorhat",         emoji: "☕", link: "https://chat.whatsapp.com/BmjRjY3evqVL9F00UQrXcU" },
  { name: "Kakinada",       emoji: "⚓", link: "https://chat.whatsapp.com/H9Ro6J04XU0HgTytm1v5Z2" },
  { name: "Kalyan",         emoji: "🏙️", link: "https://chat.whatsapp.com/H9TBEYV92CnIjqjTJbotuG" },
  { name: "Kanpur",         emoji: "🏭", link: "https://chat.whatsapp.com/LMwcf4nkR9j6AElJZXh5Du" },
  { name: "Khanna",         emoji: "🧶", link: "https://chat.whatsapp.com/EioYd88GdyY6kmvg6zf4b6" },
  { name: "Kochi",          emoji: "🌿", link: "https://chat.whatsapp.com/F0HzZOnbL58C0TG7cdmy7c" },
  { name: "Kolhapur",       emoji: "🛕", link: "https://chat.whatsapp.com/DbSE25oQH2v9Zgl5LeFLZg" },
  { name: "Kolkata",        emoji: "🎭", link: "https://chat.whatsapp.com/D53BVJ8O3eJCsnDN2sMONd" },
  { name: "Kota",           emoji: "📚", link: "https://chat.whatsapp.com/INBIOoYwtW11ptqBBhatw7" },
  { name: "Latur",          emoji: "🏙️", link: "https://chat.whatsapp.com/IK2qYc5hFJcGix6eDI2GVu" },
  { name: "Leh",            emoji: "🏔️", link: "https://chat.whatsapp.com/J2LSVBtxwK17tpkphLr4g1" },
  { name: "Liluah",         emoji: "🏙️", link: "https://chat.whatsapp.com/HgM28VvzHLz8BrzGdLGVXV" },
  { name: "Lucknow",        emoji: "👑", link: "https://chat.whatsapp.com/HHKRBIkbunYF58B7LYFUbW" },
  { name: "Ludhiana",       emoji: "🚜", link: "https://chat.whatsapp.com/LjBdT5oEO2N4TXhZ7r3bcs" },
  { name: "Machillipatnam", emoji: "🚢", link: "https://chat.whatsapp.com/E7YyulFLaho2EY1L9wCIjA" },
  { name: "Madurai",        emoji: "🛕", link: "https://chat.whatsapp.com/EmZyZwpHQ7E9h3fBESjrUs" },
  { name: "Mangalore",      emoji: "🌊", link: "https://chat.whatsapp.com/EHztNGY3jl28GYZI851Biz" },
  { name: "Manipal",        emoji: "🎓", link: "https://chat.whatsapp.com/L1D0Y1LxseC5PlUeFvs3Wo" },
  { name: "Meerut",         emoji: "📏", link: "https://chat.whatsapp.com/F0oyJtGfuVIC1a8KrOuvIT" },
  { name: "Mohali",         emoji: "🏏", link: "https://chat.whatsapp.com/JnnFpHT7r7rI29xPgOCuYg" },
  { name: "Moradabad",      emoji: "🏗️", link: "https://chat.whatsapp.com/KKZHhf2QWlr2QEgSQ11kzO" },
  { name: "Mumbai",         emoji: "🌉", link: "https://chat.whatsapp.com/H7h9ZURHDQM1bZTaQmhYNE" },
  { name: "Mysuru",         emoji: "🏰", link: "https://chat.whatsapp.com/LGHZn0enScR93U5Yiv8a9Q" },
  { name: "Nadiad",         emoji: "🏙️", link: "https://chat.whatsapp.com/DmFj6n09nWh2ON3GXGuzd5" },
  { name: "Nagpur",         emoji: "🍊", link: "https://chat.whatsapp.com/I6Um0PJpxik8aGhHCAAGOm" },
  { name: "Nanded",         emoji: "🏰", link: "https://chat.whatsapp.com/HuxvPuy5d0tGzigk9lnzNM" },
  { name: "Narsipatnam",    emoji: "🏔️", link: "https://chat.whatsapp.com/IexZUPwmqWtGlMkiRor7du" },
  { name: "Nashik",         emoji: "🍷", link: "https://chat.whatsapp.com/DRHt4GoHjdr7T14xZTLZjP" },
  { name: "Nizamabad",      emoji: "🏛️", link: "https://chat.whatsapp.com/KbF8AavM69mLJJNbyPrX4f" },
  { name: "Noida",          emoji: "🏢", link: "https://chat.whatsapp.com/LZWWAe23fT92YPp7UOUESm" },
  { name: "Panchkula",      emoji: "🏡", link: "https://chat.whatsapp.com/Kp9Y3QqesTL082iDRhWeqE" },
  { name: "Panipat",        emoji: "🏭", link: "https://chat.whatsapp.com/LPRCCkm8W1IAtuj5bssS6t" },
  { name: "Pathankot",      emoji: "🎖️", link: "https://chat.whatsapp.com/JSicy9taorC8HIZY2KHiUP" },
  { name: "Patiala",        emoji: "🏰", link: "https://chat.whatsapp.com/Io2hbHAGhTU8FkQIfxHYXt" },
  { name: "Patna",          emoji: "📜", link: "https://chat.whatsapp.com/IoC1bITDASPJHzCGUZ3yc5" },
  { name: "Pondicherry",    emoji: "🗼", link: "https://chat.whatsapp.com/KefdoyQzijw67mYUc1eeEY" },
  { name: "Prayagraj",      emoji: "🙏", link: "https://chat.whatsapp.com/BuyEp5BKpoVE7QoX9KGd7c" },
  { name: "Pune",           emoji: "🎓", link: "https://chat.whatsapp.com/HPLY7BL1vozASZQzTZCPSP" },
  { name: "Raipur",         emoji: "🏢", link: "https://chat.whatsapp.com/GzqHPbLwiDh3hZDSkz359P" },
  { name: "Rajkot",         emoji: "🦁", link: "https://chat.whatsapp.com/EodNIKjjkf281ZPEZylOYU" },
  { name: "Ranchi",         emoji: "🏔️", link: "https://chat.whatsapp.com/K7PvbTgJUZrKd48M5Iqvvf" },
  { name: "Rourkela",       emoji: "🏭", link: "https://chat.whatsapp.com/Hga1PS1eh5G6pzR2th7b6f" },
  { name: "Salem",          emoji: "🏔️", link: "https://chat.whatsapp.com/JAPDDWOfvLnHeJcjvRCBij" },
  { name: "Siliguri",       emoji: "🏔️", link: "https://chat.whatsapp.com/LJz4V1lnEwL1HzB7Bz8i8v" },
  { name: "Sri Ganganagar", emoji: "🌾", link: "https://chat.whatsapp.com/DIvJjXPRJO0HY6dQ2v4Vyp" },
  { name: "Srinagar",       emoji: "❄️", link: "https://chat.whatsapp.com/JI7HWEwYWMQHov6BAEfXe1" },
  { name: "Surat",          emoji: "💎", link: "https://chat.whatsapp.com/GotX3xuqRjR5amrTsxRh2d" },
  { name: "Thane",          emoji: "🏙️", link: "https://chat.whatsapp.com/Lu6uxTc78jP9jIynhYgCsI" },
  { name: "Thrissur",       emoji: "🐘", link: "https://chat.whatsapp.com/GOZluDHrUMvD0Ap3uv8OKQ" },
  { name: "Trivandrum",     emoji: "🌴", link: "https://chat.whatsapp.com/HYWBskslT5M8UP9uw44hWW" },
  { name: "Tumakuru",       emoji: "🏙️", link: "https://chat.whatsapp.com/EpjgVY6yCGH2jm4yoxFyuX" },
  { name: "Udaipur",        emoji: "🛶", link: "https://chat.whatsapp.com/Jx7RWyfPwMUGmtG4PgqKdo" },
  { name: "Ujjain",         emoji: "🛕", link: "https://chat.whatsapp.com/K2y5MoUZZ1Q6UH8ZOT6cDS" },
  { name: "Vadodara",       emoji: "🏰", link: "https://chat.whatsapp.com/D49N1PyTVDxBzwiVLPiP1U" },
  { name: "Vellore",        emoji: "🏰", link: "https://chat.whatsapp.com/IhVK5b3S22QHizrAFZexqH" },
  { name: "Vijayawada",     emoji: "🎡", link: "https://chat.whatsapp.com/J7ry2aZbXP1ILOGnjElSv9" },
  { name: "Vizag",          emoji: "🌅", link: "https://chat.whatsapp.com/FLvT3py1jp83Njakdixndz" },
  { name: "Vizianagaram",   emoji: "🛕", link: "https://chat.whatsapp.com/CN174U2yaKl8BTcEST7Nsw" },
  { name: "Warangal",       emoji: "🏰", link: "https://chat.whatsapp.com/Czg6Ni2suMRHy6vV794PPZ" },
  { name: "Yamunanagar",    emoji: "🔧", link: "https://chat.whatsapp.com/E45Eh59Pq1DBF39e1X5pwZ" },
  { name: "Zirakpur",       emoji: "✨", link: "https://chat.whatsapp.com/EceAbRpznby4fCcFtnEERO" },
];

const PRIMARY   = '#3F66A6';
const GOLD      = '#F59E0B';
const DARK_BG   = '#0f172a';
const CARD_BG   = '#1e293b';
const TEXT_DIM  = '#94a3b8';

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const topPad = Platform.OS === 'web' ? 56 : insets.top;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CITIES;
    return CITIES.filter((c) => c.name.toLowerCase().includes(q));
  }, [query]);

  function openLink(url: string) {
    Linking.openURL(url).catch(() => {});
  }

  return (
    <View style={[s.root, { backgroundColor: DARK_BG }]}>

      {/* ── Header ── */}
      <LinearGradient
        colors={['#0f172a', '#1e1b4b', '#312e81']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: topPad + 8 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>

        <View style={s.pill}>
          <View style={s.goldDot} />
          <Text style={s.pillText}>TUTOR COMMUNITIES</Text>
        </View>

        <Text style={s.title}>Join Your <Text style={s.gold}>City</Text> Community</Text>
        <Text style={s.subtitle}>Connect with top tutors on WhatsApp — {CITIES.length} cities across India</Text>

        {/* Search */}
        <View style={s.searchWrap}>
          <Feather name="search" size={16} color={TEXT_DIM} style={{ marginRight: 8 }} />
          <TextInput
            style={s.searchInput}
            placeholder="Search your city…"
            placeholderTextColor={TEXT_DIM}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')}>
              <Feather name="x" size={16} color={TEXT_DIM} />
            </Pressable>
          )}
        </View>
      </LinearGradient>

      {/* ── List ── */}
      {filtered.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyEmoji}>🔍</Text>
          <Text style={s.emptyText}>No city found for "{query}"</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.name}
          numColumns={2}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}
          columnWrapperStyle={{ gap: 12 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => openLink(item.link)}
              style={s.card}
            >
              <View style={s.emojiBox}>
                <Text style={s.emoji}>{item.emoji}</Text>
              </View>
              <Text style={s.cityName}>{item.name}</Text>
              <View style={s.joinBtn}>
                <Feather name="message-circle" size={13} color="#000" />
                <Text style={s.joinText}>Join Now</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1 },
  header:     { paddingHorizontal: 20, paddingBottom: 20 },
  backBtn:    {
    width: 36, height: 36, borderRadius: 10, marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center',
  },
  pill:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  goldDot:    { width: 7, height: 7, borderRadius: 4, backgroundColor: GOLD, shadowColor: GOLD, shadowOpacity: 0.9, shadowRadius: 6 },
  pillText:   { color: GOLD, fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1.5 },
  title:      { color: '#fff', fontSize: 26, fontFamily: 'Inter_700Bold', lineHeight: 34, marginBottom: 6 },
  gold:       { color: GOLD },
  subtitle:   { color: '#cbd5e1', fontSize: 13, fontFamily: 'Inter_400Regular', marginBottom: 18 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0f172a', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  searchInput: {
    flex: 1, color: '#fff', fontSize: 15,
    fontFamily: 'Inter_400Regular',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
  },
  card: {
    flex: 1, backgroundColor: CARD_BG, borderRadius: 20,
    padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  emojiBox: {
    width: 60, height: 60, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  emoji:    { fontSize: 28 },
  cityName: {
    color: '#fff', fontSize: 14, fontFamily: 'Inter_700Bold',
    textAlign: 'center', marginBottom: 12,
  },
  joinBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: GOLD, borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 14,
  },
  joinText: { color: '#000', fontSize: 12, fontFamily: 'Inter_700Bold' },
  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText:  { color: TEXT_DIM, fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});

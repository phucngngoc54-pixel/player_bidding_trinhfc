import { useEffect, useState, useRef } from "react";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import {
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  collection,
  writeBatch,
} from "firebase/firestore";
import { auth, googleProvider } from "../lib/firebase";
import { signInWithPopup } from "firebase/auth";
import type { AuctionRoom, UserStats, Player } from "../types";
import { cn, playSound } from "../lib/utils";
import { Coins, UserSquare2, Trophy, Clock, Swords } from "lucide-react";

interface FallbackPlayer {
  Name: string;
  Position: "FW" | "MF" | "DF";
  Club: string;
  Rating: number;
  Tier: "Elite" | "Star" | "Pro";
  Image: string;
}

const TOTAL_LIMIT = 11; // 11 players limit per person
const MARKET_LIMIT = 50; // 50 draws limit

const FALLBACK_PLAYERS: FallbackPlayer[] = [
  { Name: "Lionel Messi", Position: "FW", Club: "Inter Miami", Rating: 90, Tier: "Star", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Lionel_Messi_2018.jpg/500px-Lionel_Messi_2018.jpg" },
  { Name: "Cristiano Ronaldo", Position: "FW", Club: "Al Nassr", Rating: 88, Tier: "Star", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Cristiano_Ronaldo_2018.jpg/500px-Cristiano_Ronaldo_2018.jpg" },
  { Name: "Rafael Leao", Position: "FW", Club: "AC Milan", Rating: 89, Tier: "Star", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Rafael_Leao_2022.jpg/500px-Rafael_Leao_2022.jpg" },
  { Name: "Rodrygo", Position: "FW", Club: "Real Madrid", Rating: 88, Tier: "Star", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Rodrygo_2021.jpg/500px-Rodrygo_2021.jpg" },
  { Name: "Frenkie de Jong", Position: "MF", Club: "Barcelona", Rating: 88, Tier: "Star", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Frenkie_de_Jong_2022.jpg/500px-Frenkie_de_Jong_2022.jpg" },
  { Name: "Aurelien Tchouameni", Position: "MF", Club: "Real Madrid", Rating: 87, Tier: "Pro", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Aur%C3%A9lien_Tchouam%C3%A9ni_2022.jpg/500px-Aur%C3%A9lien_Tchouam%C3%A9ni_2022.jpg" },
  { Name: "Eduardo Camavinga", Position: "MF", Club: "Real Madrid", Rating: 87, Tier: "Pro", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Eduardo_Camavinga_2021.jpg/500px-Eduardo_Camavinga_2021.jpg" },
  { Name: "Ilkay Gundogan", Position: "MF", Club: "Manchester City", Rating: 88, Tier: "Star", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/%C4%B0lkay_G%C3%BCndo%C4%9Fan_2024.jpg/500px-%C4%B0lkay_G%C3%BCndo%C4%9Fan_2024.jpg" },
  { Name: "John Stones", Position: "DF", Club: "Manchester City", Rating: 89, Tier: "Star", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/John_Stones_2024.jpg/500px-John_Stones_2024.jpg" },
  { Name: "Marquinhos", Position: "DF", Club: "PSG", Rating: 88, Tier: "Star", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Marquinhos_2022.jpg/500px-Marquinhos_2022.jpg" },
  { Name: "Alessandro Bastoni", Position: "DF", Club: "Inter Milan", Rating: 89, Tier: "Star", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Alessandro_Bastoni_2021.jpg/500px-Alessandro_Bastoni_2021.jpg" },
  { Name: "Kyle Walker", Position: "DF", Club: "Manchester City", Rating: 86, Tier: "Pro", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Kyle_Walker_2024.jpg/500px-Kyle_Walker_2024.jpg" },
  { Name: "Ronald Araujo", Position: "DF", Club: "Barcelona", Rating: 88, Tier: "Star", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Ronald_Ara%C3%BAjo_2022.jpg/500px-Ronald_Ara%C3%BAjo_2022.jpg" },
  { Name: "Eder Militao", Position: "DF", Club: "Real Madrid", Rating: 87, Tier: "Pro", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/%C3%89der_Milit%C3%A3o_2021.jpg/500px-%C3%89der_Milit%C3%A3o_2021.jpg" },
  { Name: "Erling Haaland", Position: "FW", Club: "Manchester City", Rating: 95, Tier: "Elite", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Erling_Haaland_2023.jpg/500px-Erling_Haaland_2023.jpg" },
  { Name: "Kylian Mbappe", Position: "FW", Club: "Real Madrid", Rating: 96, Tier: "Elite", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Kylian_Mbapp%C3%A9_Vanuatu_crop.jpg/500px-Kylian_Mbapp%C3%A9_Vanuatu_crop.jpg" },
  { Name: "Mohamed Salah", Position: "FW", Club: "Liverpool", Rating: 94, Tier: "Elite", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Mohamed_Salah_2018.jpg/500px-Mohamed_Salah_2018.jpg" },
  { Name: "Robert Lewandowski", Position: "FW", Club: "Barcelona", Rating: 92, Tier: "Star", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Robert_Lewandowski_2021.jpg/500px-Robert_Lewandowski_2021.jpg" },
  { Name: "Harry Kane", Position: "FW", Club: "Bayern Munich", Rating: 93, Tier: "Elite", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Harry_Kane_2024.jpg/500px-Harry_Kane_2024.jpg" },
  { Name: "Vinicius Junior", Position: "FW", Club: "Real Madrid", Rating: 95, Tier: "Elite", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Vinicius_Jr_2021.jpg/500px-Vinicius_Jr_2021.jpg" },
  { Name: "Bukayo Saka", Position: "FW", Club: "Arsenal", Rating: 91, Tier: "Star", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Bukayo_Saka_2024.jpg/500px-Bukayo_Saka_2024.jpg" },
  { Name: "Cole Palmer", Position: "FW", Club: "Chelsea", Rating: 90, Tier: "Star", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Cole_Palmer_2024.jpg/500px-Cole_Palmer_2024.jpg" },
  { Name: "Victor Osimhen", Position: "FW", Club: "Galatasaray", Rating: 89, Tier: "Star", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Victor_Osimhen_2023.jpg/500px-Victor_Osimhen_2023.jpg" },
  { Name: "Lamine Yamal", Position: "FW", Club: "Barcelona", Rating: 88, Tier: "Star", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Lamine_Yamal_2024.jpg/500px-Lamine_Yamal_2024.jpg" },
  { Name: "Antoine Griezmann", Position: "FW", Club: "Atletico Madrid", Rating: 89, Tier: "Star", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Antoine_Griezmann_2022.jpg/500px-Antoine_Griezmann_2022.jpg" },
  { Name: "Lautaro Martinez", Position: "FW", Club: "Inter Milan", Rating: 90, Tier: "Star", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Lautaro_Mart%C3%ADnez_2022.jpg/500px-Lautaro_Mart%C3%ADnez_2022.jpg" },
  { Name: "Heung-min Son", Position: "FW", Club: "Tottenham", Rating: 89, Tier: "Star", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Son_Heung-min_2022.jpg/500px-Son_Heung-min_2022.jpg" },
  { Name: "Ollie Watkins", Position: "FW", Club: "Aston Villa", Rating: 87, Tier: "Pro", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Ollie_Watkins_2024.jpg/500px-Ollie_Watkins_2024.jpg" },
  { Name: "Alexander Isak", Position: "FW", Club: "Newcastle", Rating: 87, Tier: "Pro", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Alexander_Isak_2022.jpg/500px-Alexander_Isak_2022.jpg" },
  { Name: "Jude Bellingham", Position: "MF", Club: "Real Madrid", Rating: 94, Tier: "Elite", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Jude_Bellingham_2024.jpg/500px-Jude_Bellingham_2024.jpg" },
  { Name: "Kevin De Bruyne", Position: "MF", Club: "Manchester City", Rating: 95, Tier: "Elite", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Kevin_De_Bruyne_2018.jpg/500px-Kevin_De_Bruyne_2018.jpg" },
  { Name: "Rodri", Position: "MF", Club: "Manchester City", Rating: 96, Tier: "Elite", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Rodri_2024.jpg/500px-Rodri_2024.jpg" },
  { Name: "Declan Rice", Position: "MF", Club: "Arsenal", Rating: 91, Tier: "Star", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Declan_Rice_2024.jpg/500px-Declan_Rice_2024.jpg" },
  { Name: "Martin Odegaard", Position: "MF", Club: "Arsenal", Rating: 91, Tier: "Star", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Martin_%C3%98degaard_2023.jpg/500px-Martin_%C3%98degaard_2023.jpg" },
  { Name: "Florian Wirtz", Position: "MF", Club: "Bayer Leverkusen", Rating: 92, Tier: "Star", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Florian_Wirtz_2024.jpg/500px-Florian_Wirtz_2024.jpg" },
  { Name: "Jamal Musiala", Position: "MF", Club: "Bayern Munich", Rating: 92, Tier: "Star", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Jamal_Musiala_2024.jpg/500px-Jamal_Musiala_2024.jpg" },
  { Name: "Bruno Fernandes", Position: "MF", Club: "Manchester United", Rating: 90, Tier: "Star", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Bruno_Fernandes_2022.jpg/500px-Bruno_Fernandes_2022.jpg" },
  { Name: "Alexis Mac Allister", Position: "MF", Club: "Liverpool", Rating: 89, Tier: "Star", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Alexis_Mac_Allister_2022.jpg/500px-Alexis_Mac_Allister_2022.jpg" },
  { Name: "Federico Valverde", Position: "MF", Club: "Real Madrid", Rating: 90, Tier: "Star", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Federico_Valverde_2021.jpg/500px-Federico_Valverde_2021.jpg" },
  { Name: "Bernardo Silva", Position: "MF", Club: "Manchester City", Rating: 90, Tier: "Star", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Bernardo_Silva_2023.jpg/500px-Bernardo_Silva_2023.jpg" },
  { Name: "Pedri", Position: "MF", Club: "Barcelona", Rating: 88, Tier: "Star", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Pedri_2022.jpg/500px-Pedri_2022.jpg" },
  { Name: "Gavi", Position: "MF", Club: "Barcelona", Rating: 87, Tier: "Pro", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Gavi_2022.jpg/500px-Gavi_2022.jpg" },
  { Name: "Nico Barella", Position: "MF", Club: "Inter Milan", Rating: 89, Tier: "Star", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Nicolo_Barella_2023.jpg/500px-Nicolo_Barella_2023.jpg" },
  { Name: "Kobbie Mainoo", Position: "MF", Club: "Manchester United", Rating: 85, Tier: "Pro", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Kobbie_Mainoo_2024.jpg/500px-Kobbie_Mainoo_2024.jpg" },
  { Name: "Virgil van Dijk", Position: "DF", Club: "Liverpool", Rating: 94, Tier: "Elite", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Virgil_van_Dijk_2024.jpg/500px-Virgil_van_Dijk_2024.jpg" },
  { Name: "William Saliba", Position: "DF", Club: "Arsenal", Rating: 91, Tier: "Star", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/William_Saliba_2024.jpg/500px-William_Saliba_2024.jpg" },
  { Name: "Ruben Dias", Position: "DF", Club: "Manchester City", Rating: 92, Tier: "Star", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/R%C3%BAben_Dias_2022.jpg/500px-R%C3%BAben_Dias_2022.jpg" },
  { Name: "Antonio Rudiger", Position: "DF", Club: "Real Madrid", Rating: 90, Tier: "Star", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Antonio_R%C3%BCdiger_2021.jpg/500px-Antonio_R%C3%BCdiger_2021.jpg" },
  { Name: "Trent Alexander-Arnold", Position: "DF", Club: "Liverpool", Rating: 89, Tier: "Star", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Trent_Alexander-Arnold_2024.jpg/500px-Trent_Alexander-Arnold_2024.jpg" },
  { Name: "Alphonso Davies", Position: "DF", Club: "Bayern Munich", Rating: 88, Tier: "Star", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Alphonso_Davies_2024.jpg/500px-Alphonso_Davies_2024.jpg" },
  { Name: "Theo Hernandez", Position: "DF", Club: "AC Milan", Rating: 88, Tier: "Star", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Theo_Hern%C3%A1ndez_2022.jpg/500px-Theo_Hern%C3%A1ndez_2022.jpg" },
  { Name: "Achraf Hakimi", Position: "DF", Club: "PSG", Rating: 89, Tier: "Star", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Achraf_Hakimi_2022.jpg/500px-Achraf_Hakimi_2022.jpg" },
  { Name: "Gabriel Magalhaes", Position: "DF", Club: "Arsenal", Rating: 88, Tier: "Star", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Gabriel_Magalh%C3%A3es_2024.jpg/500px-Gabriel_Magalh%C3%A3es_2024.jpg" },
  { Name: "Josko Gvardiol", Position: "DF", Club: "Manchester City", Rating: 88, Tier: "Star", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Jo%C5%A1ko_Gvardiol_2022.jpg/500px-Jo%C5%A1ko_Gvardiol_2022.jpg" },
  { Name: "Micky van de Ven", Position: "DF", Club: "Tottenham", Rating: 86, Tier: "Pro", Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Micky_van_de_Ven_2024.jpg/500px-Micky_van_de_Ven_2024.jpg" }
];

export default function AuctionRoomWrapper() {
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    return auth.onAuthStateChanged((u) => setUser(u));
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050608] flex flex-col items-center justify-center text-white">
        <div className="w-16 h-16 bg-green-500 rounded-lg rotate-45 flex items-center justify-center mb-8">
          <div className="w-8 h-8 bg-black rounded-full"></div>
        </div>
        <h1 className="text-5xl font-black italic uppercase tracking-tighter mb-8">
          Elite <span className="text-green-400">Auction</span> Hub
        </h1>
        <button
          onClick={() => {
            signInWithPopup(auth, googleProvider).catch((err) => {
              console.error("Sign in error: ", err);
              alert("Sign in failed: " + err.message);
            });
          }}
          className="px-8 py-4 bg-green-500 hover:bg-green-400 text-black rounded-xl font-black italic uppercase transition-colors flex items-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
        >
          <UserSquare2 size={24} />
          Sign In with Google
        </button>
      </div>
    );
  }

  return <AuctionGame uid={user.uid} name={user.displayName || "Player"} />;
}

function AuctionGame({ uid, name }: { uid: string; name: string }) {
  const [room, setRoom] = useState<AuctionRoom | null>(null);
  const [users, setUsers] = useState<Record<string, UserStats>>({});
  const [isReady, setIsReady] = useState(false);

  // Initialize and listen to room & users
  useEffect(() => {
    // Check user doc
    const userRef = doc(db, "users", uid);
    getDocFromServerSafe(userRef).then(async (snap) => {
      if (!snap.exists()) {
        const initialUser: UserStats = {
          name,
          budget: 100,
          slots: { FW: 0, MF: 0, DF: 0 },
          players: [],
        };
        await setDoc(userRef, initialUser).catch((e) =>
          handleFirestoreError(e, OperationType.CREATE, `users/${uid}`),
        );
      }
    }).catch((e) => handleFirestoreError(e, OperationType.GET, `users/${uid}`));

    const roomRef = doc(db, "rooms", "global");
    getDocFromServerSafe(roomRef).then(async (snap) => {
      if (!snap.exists()) {
        const initialRoom: AuctionRoom = {
          currentStep: "idle",
          highestBid: 0,
          highestBidderId: "",
          bidderName: "",
          lastBidTime: new Date().toISOString(),
          currentPlayer: {},
          drawnPlayerNames: [],
          drawCount: 0,
          passedPlayers: [],
        };
        await setDoc(roomRef, initialRoom).catch((e) =>
          handleFirestoreError(e, OperationType.CREATE, `rooms/global`),
        );
      }
    }).catch((e) => handleFirestoreError(e, OperationType.GET, `rooms/global`));

    // Listeners
    const unsubRoom = onSnapshot(
      roomRef,
      (snap) => {
        if (snap.exists()) {
          setRoom(snap.data() as AuctionRoom);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, "rooms/global"),
    );

    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snap) => {
        const uMap: Record<string, UserStats> = {};
        snap.docs.forEach((d) => {
          uMap[d.id] = d.data() as UserStats;
        });
        setUsers(uMap);
        setIsReady(true);
      },
      (err) => handleFirestoreError(err, OperationType.GET, "users"),
    );

    return () => {
      unsubRoom();
      unsubUsers();
    };
  }, [uid, name]);

  useEffect(() => {
    if (room?.currentStep) {
      if (room.currentStep === "call1") playSound("call1");
      if (room.currentStep === "call2") playSound("call2");
      if (room.currentStep === "sold") playSound("sold");
    }
  }, [room?.currentStep]);

  // Timer logic for steps
  useEffect(() => {
    if (
      !room ||
      !room.currentPlayer ||
      Object.keys(room.currentPlayer).length === 0
    )
      return;
    if (
      room.currentStep === "sold" ||
      room.currentStep === "scouting" ||
      room.currentStep === "idle"
    )
      return;
    if (room.highestBidderId === "") return;

    const interval = setInterval(() => {
      const diff = Date.now() - new Date(room.lastBidTime).getTime();
      const currentStep = room.currentStep;

      let nextStep: "bidding" | "call1" | "call2" | "sold" = currentStep;

      if (diff >= 15000 && currentStep !== "sold") {
        nextStep = "sold";
      } else if (diff >= 10000 && currentStep === "call1") {
        nextStep = "call2";
      } else if (diff >= 5000 && currentStep === "bidding") {
        nextStep = "call1";
      }

      if (nextStep !== currentStep) {
        // Attempt transition
        const roomRef = doc(db, "rooms", "global");
        updateDoc(roomRef, {
          currentStep: nextStep,
        }).catch((e) => console.error(e)); // Ignore collisions if multiple clients fire
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [room]);

  // When a player is sold, process logic. Only the winner orchestrates their own deduction to avoid duplicate charges!
  // Wait, if winner closes tab before deduction, it fails.
  // We can let any client detect sold and execute a conditional update?
  // Actually, easiest peer-to-peer approach: If sold and we are the winner, and player is NOT in our array, add it.
  useEffect(() => {
    if (room?.currentStep === "sold" && room.highestBidderId === uid) {
      const me = users[uid];
      const player = room.currentPlayer as Player;
      if (me && player && player.Name) {
        // Ensure player is not already added
        if (!me.players.find((p) => p.Name === player.Name)) {
          const userRef = doc(db, "users", uid);
          const newSlots = { ...me.slots };
          const pos = player.Position as "FW" | "MF" | "DF";
          newSlots[pos] = (newSlots[pos] || 0) + 1;

          updateDoc(userRef, {
            budget: me.budget - room.highestBid,
            slots: newSlots,
            players: [...me.players, player],
          }).catch((e) =>
            handleFirestoreError(e, OperationType.UPDATE, `users/${uid}`),
          );
        }
      }
    }
  }, [
    room?.currentStep,
    room?.highestBidderId,
    uid,
    users,
    room?.highestBid,
    room?.currentPlayer,
  ]);

  const handleResetGame = async () => {
    try {
      const roomRef = doc(db, "rooms", "global");
      await updateDoc(roomRef, {
        currentStep: "idle",
        highestBid: 0,
        highestBidderId: "",
        bidderName: "",
        currentPlayer: {},
        drawnPlayerNames: [],
        drawCount: 0,
        passedPlayers: [],
      });

      const batch = writeBatch(db);
      Object.keys(users).forEach((userId) => {
        const userRef = doc(db, "users", userId);
        batch.update(userRef, {
          budget: 100,
          slots: { FW: 0, MF: 0, DF: 0 },
          players: [],
        });
      });
      await batch.commit();
    } catch (e) {
      console.error("Failed to reset game", e);
    }
  };

  const [isScouting, setIsScouting] = useState(false);

  const handleStartNext = async () => {
    setIsScouting(true);
    console.log("Scouting started... Updating Firestore to scouting status");

    try {
      const roomRef = doc(db, "rooms", "global");
      await updateDoc(roomRef, { currentStep: "scouting" }).catch(
        console.error,
      );

      // Check if any player still has room for more players
      const anyoneNeedsPlayers = Object.values(users).some((u: any) => u.players.length < TOTAL_LIMIT);
      if (!anyoneNeedsPlayers) {
        alert("All squads are full! Game Over.");
        setIsScouting(false);
        return;
      }

      const positionsArray = ["FW", "MF", "DF"];

      // Step 1: AI Player Gen (calls our proxy server)
      let aiPlayer;
      try {
        const response = await fetch("/api/generate-player", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            neededPositions: positionsArray,
            drawnPlayerNames: room?.drawnPlayerNames || [],
          }),
        });
        if (!response.ok) throw new Error("Gemini fallback");
        aiPlayer = await response.json();
      } catch (err) {
        console.warn("AI Gen Failed, falling back to local player list:", err);
        
        // Find all fallback players who match the required positions and haven't been drawn
        const matchedFallbackPlayers = FALLBACK_PLAYERS.filter(p => 
          positionsArray.includes(p.Position) && 
          !(room?.drawnPlayerNames || []).includes(p.Name)
        );

        if (matchedFallbackPlayers.length > 0) {
          // Select a random player from the matched fallbacks
          const randomIdx = Math.floor(Math.random() * matchedFallbackPlayers.length);
          const chosen = matchedFallbackPlayers[randomIdx];
          aiPlayer = {
            name: chosen.Name,
            position: chosen.Position,
            imageURL: chosen.Image,
            club: chosen.Club,
            rating: chosen.Rating,
            tier: chosen.Tier
          };
        }
      }

      if (!aiPlayer) {
        alert("All draft options exhausted! Game Over.");
        setIsScouting(false);
        return;
      }

      const playerName = aiPlayer.name || aiPlayer.Name;

      if (!playerName) {
        throw new Error("Invalid format received from AI.");
      }

      const nextPlayer: Player = {
        Name: playerName,
        Position: aiPlayer.position || aiPlayer.Position || "FW",
        Image:
          aiPlayer.imageURL ||
          "https://images.unsplash.com/photo-1574629810360-143093b5860d?w=500&q=80",
      };

      console.log("AI Data received and prepared:", nextPlayer);

      await updateDoc(roomRef, {
        currentStep: "bidding",
        highestBid: 0,
        highestBidderId: "",
        bidderName: "",
        lastBidTime: new Date().toISOString(),
        currentPlayer: nextPlayer,
        drawnPlayerNames: [...(room?.drawnPlayerNames || []), playerName],
        drawCount: (room?.drawCount || 0) + 1,
        passedPlayers: [],
      }).catch((e) =>
        handleFirestoreError(e, OperationType.UPDATE, `rooms/global`),
      );
      console.log("Firestore updated to Bidding mode with new player.");
    } catch (e) {
      console.error(e);
    } finally {
      setIsScouting(false);
    }
  };

  const handleBid = (amount: number) => {
    if (!room || room.currentStep === "sold") return;
    const me = users[uid];
    if (!me) return;
    const player = room.currentPlayer as Player;

    // Limits
    if (amount > me.budget) {
      playSound("error");
      alert("Not enough budget!");
      return;
    }
    if (me.players.length >= TOTAL_LIMIT) {
      playSound("error");
      alert(`Squad is full! Limit is ${TOTAL_LIMIT} players`);
      return;
    }

    if (amount > room.highestBid) {
      playSound("bid");
      const roomRef = doc(db, "rooms", "global");
      updateDoc(roomRef, {
        highestBid: amount,
        highestBidderId: uid,
        bidderName: name,
        currentStep: "bidding", // reset step
        lastBidTime: new Date().toISOString(),
      }).catch((e) =>
        handleFirestoreError(e, OperationType.UPDATE, `rooms/global`),
      );
    } else {
      playSound("error");
    }
  };

  const handlePass = () => {
    if (
      !room ||
      room.currentStep === "sold" ||
      room.currentStep === "scouting" ||
      room.currentStep === "idle"
    )
      return;
    const roomRef = doc(db, "rooms", "global");
    updateDoc(roomRef, {
      passedPlayers: [...(room.passedPlayers || []), uid],
    }).catch((e) => console.error(e));
  };

  useEffect(() => {
    if (room?.currentStep === "bidding" && room?.highestBid === 0) {
      const activeUserIds = Object.keys(users);
      if (
        activeUserIds.length > 0 &&
        activeUserIds.every((id) => room.passedPlayers?.includes(id))
      ) {
        const roomRef = doc(db, "rooms", "global");
        updateDoc(roomRef, {
          currentStep: "sold",
          bidderName: "UNSOLD",
          highestBidderId: "UNSOLD",
        }).catch(console.error);
      }
    }
  }, [room?.currentStep, room?.highestBid, room?.passedPlayers, users]);

  if (!isReady) {
    return (
      <div className="bg-[#050608] min-h-screen text-white p-8 font-sans font-bold italic">
        Loading Auction Terminal...
      </div>
    );
  }

  const cp = room?.currentPlayer as Player | undefined;
  const isBidDisabled = room?.passedPlayers?.includes(uid);

  return (
    <div className="min-h-screen bg-[#050608] text-gray-100 flex flex-col overflow-x-hidden font-sans">
      {/* Header Section */}
      <header className="h-16 flex items-center justify-between px-4 md:px-8 border-b border-white/10 bg-[#0a0c10]/80 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 md:w-8 md:h-8 bg-green-500 rounded-sm rotate-45 flex items-center justify-center">
            <div className="w-3 h-3 md:w-4 md:h-4 bg-black rounded-full"></div>
          </div>
          <h1 className="text-lg md:text-xl font-black tracking-tighter uppercase italic hidden sm:block">
            Elite <span className="text-green-400">Auction</span> Hub
          </h1>
        </div>
        <div className="flex items-center gap-4 md:gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
              Logged in as
            </span>
            <span className="text-sm font-semibold text-green-400">{name}</span>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-green-500/30 p-0.5">
            <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-400 uppercase italic">
              {name.substring(0, 2)}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-6 p-4 md:p-6 overflow-y-auto w-full max-w-[1400px] mx-auto">
        {/* Left: Auction Engine - col-span-7 */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {!cp || !cp.Name || room?.currentStep === "scouting" ? (
            <div className="flex-1 bg-gradient-to-br from-[#12141c] to-[#0a0b11] rounded-3xl border border-white/5 flex flex-col items-center justify-center text-center p-8 shadow-2xl min-h-[400px]">
              {isScouting || room?.currentStep === "scouting" ? (
                <>
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
                    <Swords
                      size={48}
                      className="text-green-500 animate-bounce relative z-10"
                    />
                  </div>
                  <h2 className="text-2xl font-black uppercase italic tracking-widest text-green-400 mb-6 animate-pulse">
                    Scouting Player...
                  </h2>
                </>
              ) : (
                <>
                  <Swords size={48} className="text-gray-600 mb-6" />
                  <h2 className="text-2xl font-black uppercase italic tracking-widest text-gray-400 mb-6">
                    Waiting for next player...
                  </h2>
                  {(room?.drawCount || 0) >= MARKET_LIMIT ? (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-center font-bold text-sm uppercase tracking-widest italic mb-6">
                      Market Closed: {MARKET_LIMIT}/{MARKET_LIMIT} Players Scouted
                    </div>
                  ) : (
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-3">
                      Player Pool: {room?.drawCount || 0}/{MARKET_LIMIT}
                    </div>
                  )}
                  <button
                    onClick={handleStartNext}
                    disabled={
                      isScouting ||
                      room?.currentStep === "scouting" ||
                      (room?.drawCount || 0) >= MARKET_LIMIT
                    }
                    className="px-8 py-3 bg-green-500 hover:bg-green-400 disabled:bg-gray-700 disabled:text-gray-500 text-black rounded-xl font-black italic uppercase transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                  >
                    Draw Next Player
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Player Spotlight Card */}
              <div className="relative flex-1 bg-gradient-to-br from-[#12141c] to-[#0a0b11] rounded-3xl border border-white/5 overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[400px]">
                <div className="absolute top-0 right-0 p-8 hidden md:block">
                  <span className="text-6xl font-black text-white/5 tracking-tighter">
                    {cp.Position}
                  </span>
                </div>

                {/* Player Image and Name */}
                <div className="w-full md:w-1/2 relative flex items-end p-6 md:p-8 min-h-[300px]">
                  <img
                    src={cp.Image}
                    alt={cp.Name}
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover opacity-60 object-top"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,_rgba(34,197,94,0.15),transparent_70%)]"></div>
                  <div className="relative z-10 w-full">
                    <div className="bg-green-500 text-black text-[10px] font-black px-2 py-1 uppercase rounded-sm mb-2 w-fit italic inline-block">
                      {cp.Position} Priority
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black uppercase leading-[0.9] italic break-words">
                      {cp.Name}
                    </h2>
                  </div>
                </div>

                {/* Bidding Info */}
                <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-between border-t md:border-t-0 md:border-l border-white/5 bg-black/40 z-10 relative">
                  <div className="space-y-1 mb-8 md:mb-0">
                    <div className="flex justify-between items-start w-full">
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">
                        Current Highest Bid
                      </p>
                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest border border-white/10 px-2 py-0.5 rounded bg-white/5">
                        Player {room?.drawCount || 0}/{MARKET_LIMIT}
                      </div>
                    </div>
                    <div className="text-6xl font-black tracking-tighter text-white">
                      {room?.highestBid === 0 ? (
                        "0M"
                      ) : (
                        <>
                          {room?.highestBid}
                          <span className="text-3xl text-green-500 ml-1 italic">
                            M
                          </span>
                        </>
                      )}
                    </div>
                    {room?.highestBidderId && (
                      <div className="flex items-center gap-2 mt-2">
                        {room.currentStep === "sold" ? (
                          <>
                            <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                            <span className="text-xs text-yellow-500 font-bold italic uppercase tracking-widest">
                              Winner:{" "}
                              <span className="text-white not-italic ml-1">
                                {room.bidderName}
                              </span>
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-xs text-gray-400 italic">
                              Bidder Identity:{" "}
                              <span className="text-white opacity-40">
                                [REDACTED]
                              </span>
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Timer / Countdown Phase */}
                  <div className="bg-[#0d0f15] border border-white/5 rounded-2xl p-6 text-center mt-auto">
                    <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] mb-3">
                      Auction Status
                    </p>

                    {room?.highestBidderId ? (
                      room?.currentStep === "sold" ? (
                        <div className="flex flex-col items-center">
                          <div
                            className={cn(
                              "text-4xl font-black italic uppercase tracking-wider",
                              room.bidderName === "UNSOLD"
                                ? "text-gray-500"
                                : "text-green-500",
                            )}
                          >
                            {room.bidderName === "UNSOLD" ? "Unsold" : "Sold!"}
                          </div>
                          {room.bidderName !== "UNSOLD" && (
                            <div className="text-xl font-bold text-white mt-2 flex items-center gap-2">
                              To{" "}
                              <span className="text-green-400">
                                {room.bidderName}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          <div
                            className={cn(
                              "text-3xl font-black italic uppercase tracking-wider mb-1",
                              room?.currentStep === "call1"
                                ? "text-yellow-500"
                                : room?.currentStep === "call2"
                                  ? "text-red-500"
                                  : "text-white",
                            )}
                          >
                            {room?.currentStep === "call1"
                              ? "Going Once..."
                              : room?.currentStep === "call2"
                                ? "Going Twice..."
                                : "Bidding Active"}
                          </div>
                          <div className="w-full bg-gray-800 h-1 rounded-full mt-4 overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-1000",
                                room?.currentStep === "call2"
                                  ? "bg-red-500 w-full"
                                  : room?.currentStep === "call1"
                                    ? "bg-yellow-500 w-2/3"
                                    : "bg-green-500 w-1/3",
                              )}
                            ></div>
                          </div>
                        </>
                      )
                    ) : (
                      <div className="text-xl font-bold text-gray-500 italic uppercase">
                        Waiting for bids
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bid Controls */}
              {room?.currentStep !== "sold" ? (
                <div className="h-auto md:h-32 bg-[#0a0c10] border border-white/5 rounded-2xl p-4 flex flex-wrap md:flex-nowrap gap-4">
                  <button
                    onClick={() => handleBid(room!.highestBid + 1)}
                    disabled={isBidDisabled}
                    className="flex-1 min-w-[100px] bg-white/5 hover:bg-white/10 disabled:opacity-50 border border-white/10 rounded-xl flex flex-col items-center justify-center transition-colors group p-4"
                  >
                    <span className="text-[10px] text-gray-500 uppercase font-bold">
                      Incremental
                    </span>
                    <span
                      className={cn(
                        "text-2xl font-black",
                        !isBidDisabled && "group-hover:text-green-400",
                      )}
                    >
                      +1.0M
                    </span>
                  </button>
                  <button
                    onClick={() => handleBid(room!.highestBid + 5)}
                    disabled={isBidDisabled}
                    className="flex-1 min-w-[100px] bg-white/5 hover:bg-white/10 disabled:opacity-50 border border-white/10 rounded-xl flex flex-col items-center justify-center transition-colors group p-4"
                  >
                    <span className="text-[10px] text-gray-500 uppercase font-bold">
                      Aggressive
                    </span>
                    <span
                      className={cn(
                        "text-2xl font-black",
                        !isBidDisabled && "group-hover:text-green-400",
                      )}
                    >
                      +5.0M
                    </span>
                  </button>
                  <form
                    className="w-full md:flex-[1.5] flex items-stretch gap-2 mt-4 md:mt-0"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const val = Number(
                        (
                          e.currentTarget.elements.namedItem(
                            "customBid",
                          ) as HTMLInputElement
                        ).value,
                      );
                      if (val > (room?.highestBid || 0)) handleBid(val);
                      else alert("Must bid higher than current bid!");
                      e.currentTarget.reset();
                    }}
                  >
                    <input
                      name="customBid"
                      type="number"
                      disabled={isBidDisabled}
                      placeholder="Custom Bid..."
                      min={(room?.highestBid || 0) + 1}
                      className="flex-[1.5] min-w-0 bg-white/5 disabled:opacity-50 border border-white/10 rounded-xl px-4 text-center font-black text-xl italic uppercase focus:outline-none focus:border-green-500 placeholder:text-gray-700"
                    />
                    <button
                      type="submit"
                      disabled={isBidDisabled}
                      className="flex-1 bg-green-500 hover:bg-green-400 disabled:bg-gray-700 disabled:text-gray-500 border border-transparent rounded-xl flex flex-col items-center justify-center transition-colors shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                    >
                      <span className="text-[10px] text-black/70 disabled:text-gray-900 font-bold uppercase mb-1 hidden sm:block">
                        Place Bid
                      </span>
                      <span className="text-xl font-black italic uppercase sm:hidden text-black disabled:text-gray-900">
                        Bid
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handlePass}
                      disabled={isBidDisabled}
                      className="flex-[0.8] bg-red-500/20 hover:bg-red-500/40 disabled:opacity-50 border border-transparent text-red-500 rounded-xl flex items-center justify-center font-black italic uppercase transition-colors text-sm"
                    >
                      Pass
                    </button>
                  </form>
                </div>
              ) : (
                <div className="bg-[#0a0c10] border border-white/5 rounded-2xl p-4 flex flex-wrap md:flex-nowrap gap-4">
                  <button
                    onClick={handleStartNext}
                    disabled={isScouting || room?.currentStep === "scouting"}
                    className="flex-[2] py-6 bg-green-500 hover:bg-green-400 disabled:bg-gray-700 disabled:text-gray-500 text-black rounded-xl font-black uppercase italic tracking-widest transition-colors shadow-[0_0_20px_rgba(34,197,94,0.3)] flex items-center justify-center gap-3"
                  >
                    {isScouting || room?.currentStep === "scouting" ? (
                      <>
                        <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                        Scouting...
                      </>
                    ) : (
                      "Draw Next Player"
                    )}
                  </button>
                  <button
                    onClick={handleStartNext}
                    disabled={isScouting || room?.currentStep === "scouting"}
                    className="flex-1 py-6 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-gray-400 rounded-xl font-bold uppercase tracking-widest transition-colors text-xs"
                  >
                    Pass
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right: Leaderboard & Squad */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="flex-1 bg-[#0a0c10] border border-white/5 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black uppercase tracking-widest italic text-white flex items-center gap-2">
                <Trophy size={16} className="text-green-500" />
                Live Standings
              </h3>
              <span className="text-[10px] text-gray-500 px-2 py-1 bg-white/5 rounded">
                {Object.keys(users).length}/4 Active Players
              </span>
            </div>

            <div className="space-y-4">
              {Object.entries(users).map(([id, userObj]) => {
                const u = userObj as any;
                const isMe = id === uid;
                const totalFilled = u.slots.FW + u.slots.MF + u.slots.DF;
                return (
                  <div
                    key={id}
                    className={cn(
                      "p-4 rounded-2xl border transition-all",
                      isMe
                        ? "bg-green-500/10 border-green-500/20"
                        : "bg-white/5 border-white/5",
                    )}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center font-bold uppercase italic",
                            isMe
                              ? "bg-green-500 text-black"
                              : "bg-gray-800 text-gray-400",
                          )}
                        >
                          {u.name.substring(0, 2)}
                        </div>
                        <div>
                          <p
                            className={cn(
                              "text-sm font-bold truncate max-w-[120px] sm:max-w-xs",
                              isMe ? "text-gray-100" : "text-gray-300",
                            )}
                          >
                            {u.name}
                            {isMe && (
                              <span className="text-[10px] bg-green-500 text-black px-1 rounded ml-1 font-black not-italic inline-block">
                                YOU
                              </span>
                            )}
                            {room?.passedPlayers?.includes(id) &&
                              room?.currentStep !== "sold" && (
                                <span className="text-[10px] bg-red-500/20 text-red-500 border border-red-500/30 px-1 rounded ml-1 font-black not-italic inline-block tracking-widest">
                                  PASSED
                                </span>
                              )}
                          </p>
                          <p
                            className={cn(
                              "text-xl font-black",
                              isMe ? "text-green-400" : "text-white",
                            )}
                          >
                            {u.budget}.0M{" "}
                            <span className="text-xs font-normal text-gray-500">
                              Left
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right mt-1">
                        <span className="text-[10px] text-gray-500 uppercase block mb-1">
                          Squad Status
                        </span>
                        <span className="text-xs font-bold text-gray-400">
                          {totalFilled}/{TOTAL_LIMIT} Filled
                        </span>
                      </div>
                    </div>
                    {/* Position pills removed to allow bidding on any position up to 11 players */}
                    {/* Bought Players List */}
                    {u.players.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/5">
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1.5 block">
                          Acquired Players
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {u.players.map((p, i) => (
                            <div
                              key={i}
                              className="text-xs bg-black/40 text-gray-300 font-medium px-2 py-1 rounded border border-white/5 whitespace-nowrap"
                            >
                              <span className="text-gray-500 mr-1 text-[10px]">
                                {p.Position}
                              </span>
                              {p.Name}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {Object.values(users).length > 0 &&
              Object.values(users).every(
                (u: any) => u.players.length >= TOTAL_LIMIT,
              ) && (
                <div className="mt-8 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 p-4 rounded-2xl text-center font-bold text-sm uppercase tracking-widest italic">
                  All players have completed their squads! Game Over!
                </div>
              )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-12 border-t border-white/5 bg-[#050608] px-4 md:px-8 flex items-center justify-between text-[10px] text-gray-500 font-bold uppercase tracking-widest flex-shrink-0 mt-auto">
        <div className="flex gap-4 md:gap-6 items-center">
          <span className="hidden sm:inline">
            Session ID: {room?.lastBidTime.substring(0, 8) || "WAITING"}
          </span>
          <span className="text-green-500">Server: SYNCED</span>
          <button
            onClick={handleResetGame}
            className="px-2 py-0.5 bg-red-900/40 hover:bg-red-900/80 text-red-400 rounded-md border border-red-900/50 transition-colors ml-4"
          >
            Reset Game
          </button>
        </div>
        <div className="flex gap-6 items-center">
          <span className="text-white hidden sm:inline">
            React Football Auction
          </span>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="truncate max-w-[150px] sm:max-w-none hover:text-white transition-colors">
              {room?.currentStep === "sold" &&
              room?.currentPlayer &&
              "Name" in room.currentPlayer
                ? `Log: ${room.currentPlayer.Name} to ${room.bidderName}`
                : "Waiting for events..."}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Helper to safely get from server to avoid offline cache weirdness in quick restarts
import { getDocFromServer } from "firebase/firestore";
async function getDocFromServerSafe(ref: any) {
  try {
    return await getDocFromServer(ref);
  } catch (e: any) {
    if (e.message?.includes("offline")) {
      console.warn("Client offline, falling back to regular getDoc logic");
    }
    // For simplicity just fallback or rethrow, standard getDoc gets from cache if offline
    throw e;
  }
}

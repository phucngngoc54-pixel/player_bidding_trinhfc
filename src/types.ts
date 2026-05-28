export interface Player {
  Name: string;
  Image: string;
  Position: string; // 'FW', 'MF', 'DF'
}

export interface UserStats {
  name: string;
  budget: number;
  slots: {
    FW: number;
    MF: number;
    DF: number;
  };
  players: Player[];
}

export interface AuctionRoom {
  currentStep: "idle" | "scouting" | "bidding" | "call1" | "call2" | "sold";
  highestBid: number;
  highestBidderId: string;
  bidderName: string;
  lastBidTime: string; // ISO string
  currentPlayer: Player | {};
  drawnPlayerNames: string[];
  drawCount: number;
  passedPlayers: string[];
}

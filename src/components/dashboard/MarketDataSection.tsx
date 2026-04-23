import VolatilityCard from "../VolatilityCard";
import IndicesCard from "../IndicesCard";
import BondForexCard from "../BondForexCard";
import CommodityCard from "../CommodityCard";
import type {
  BondYieldData,
  CommodityData,
  ForexData,
  IndexData,
  VolatilityData,
} from "@/lib/types";

export default function MarketDataSection({
  volatility,
  indices,
  bonds,
  forex,
  commodities,
}: {
  volatility: VolatilityData[];
  indices: IndexData[];
  bonds: BondYieldData;
  forex: ForexData;
  commodities: CommodityData[];
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <VolatilityCard data={volatility} />
        <IndicesCard data={indices} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BondForexCard bonds={bonds} forex={forex} />
        <CommodityCard data={commodities} />
      </div>
    </div>
  );
}

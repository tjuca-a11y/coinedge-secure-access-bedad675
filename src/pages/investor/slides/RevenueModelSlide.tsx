import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { FEE_RATES, TOTAL_FEE_RATE } from "@/hooks/useFeeCalculation";

const feeData = [
  { name: "CoinEdge Revenue", value: FEE_RATES.COINEDGE * 100, color: "#F7931A" },
  { name: "Merchant Commission", value: FEE_RATES.MERCHANT * 100, color: "#10B981" },
  { name: "Sales Rep Commission", value: FEE_RATES.SALES_REP * 100, color: "#3B82F6" },
];

export const RevenueModelSlide = () => (
  <div className="flex flex-col h-full py-8">
    <div className="text-center mb-8">
      <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Revenue Model</h2>
      <p className="text-xl text-muted-foreground">
        <span className="text-btc font-bold">{(TOTAL_FEE_RATE * 100).toFixed(2)}%</span> total fee at redemption
      </p>
    </div>

    <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-8">
      {/* Pie Chart */}
      <div className="w-full max-w-md h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={feeData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={120}
              paddingAngle={2}
              dataKey="value"
              label={({ name, value }) => `${value}%`}
              labelLine={false}
            >
              {feeData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [`${value}%`, '']}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Fee Breakdown */}
      <div className="space-y-6 max-w-md">
        <div className="bg-card/50 border border-border/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Fee Breakdown</h3>
          <div className="space-y-4">
            {feeData.map((fee, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: fee.color }}
                  />
                  <span className="text-muted-foreground">{fee.name}</span>
                </div>
                <span className="font-semibold">{fee.value}%</span>
              </div>
            ))}
            <div className="border-t border-border pt-4 flex items-center justify-between">
              <span className="font-semibold">Total Fee</span>
              <span className="font-bold text-btc">{(TOTAL_FEE_RATE * 100).toFixed(2)}%</span>
            </div>
          </div>
        </div>

        <div className="bg-btc/10 border border-btc/20 rounded-xl p-6">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Key Insight:</span> All fees are collected at redemption, 
            not at point-of-sale. This means CoinEdge captures revenue when customers convert vouchers to Bitcoin.
          </p>
        </div>
      </div>
    </div>
  </div>
);

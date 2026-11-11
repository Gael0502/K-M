import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { ArrowUpRight } from "lucide-react";
import { monthlyRevenue } from "./data";

const money = (amount: number) => `RWF ${amount.toLocaleString("en-RW")}`;

export default function RevenueChart({ title = "Revenue overview", subtitle = "Your farm's sales performance over time" }: { title?: string; subtitle?: string }) {
  return <section className="dash-panel chart-panel"><div className="dash-panel-heading"><div><h2>{title}</h2><p>{subtitle}</p></div><select aria-label="Chart period" defaultValue="Last 6 months"><option>Last 6 months</option><option>This year</option><option>Last 30 days</option></select></div><div className="chart-total"><strong>RWF 14,550,000</strong><span><ArrowUpRight size={14} /> 18.6% <small>vs. last period</small></span></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={monthlyRevenue} margin={{ left: 0, right: 7, top: 16, bottom: 0 }}><defs><linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0a9668" stopOpacity={0.19} /><stop offset="100%" stopColor="#0a9668" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#eef2ef" strokeDasharray="4 5" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#98a39c", fontSize: 11 }} dy={12} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#98a39c", fontSize: 10 }} tickFormatter={(value: number) => `${value / 1000000}m`} width={38} /><Tooltip formatter={(value) => [money(Number(value)), "Revenue"]} contentStyle={{ borderRadius: 12, border: "1px solid #e8eee9", boxShadow: "0 8px 22px #153d2514", fontSize: 12 }} /><Area type="monotone" dataKey="revenue" stroke="#079668" strokeWidth={2.5} fill="url(#revenueFill)" activeDot={{ r: 5, fill: "#079668", stroke: "white", strokeWidth: 3 }} /></AreaChart></ResponsiveContainer></div><div className="chart-legend"><span><i /> Revenue</span><span><i className="legend-muted" /> Orders, {monthlyRevenue[5].orders} this month</span></div></section>;
}

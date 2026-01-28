"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  BarChart3,
  Activity
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface CapacityLoadAnalysisProps {
  totalAvailableHours: number;
  totalAssignedHours: number;
  totalBillableHours: number;
  overloadedParalegals: number;
}

export function CapacityLoadAnalysis({
  totalAvailableHours,
  totalAssignedHours,
  totalBillableHours,
  overloadedParalegals,
}: CapacityLoadAnalysisProps) {
  // Calculate capacity metrics
  const utilizationRate = totalAvailableHours > 0 ? (totalBillableHours / totalAvailableHours) * 100 : 0;
  const capacityBuffer = totalAvailableHours - totalAssignedHours;
  const overloadRisk = totalAssignedHours > totalAvailableHours;
  
  // Generate monthly trend data (last 6 months) - should use real historical data
  const generateMonthlyTrend = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((month) => {
      // TODO: Replace with real historical data from database
      // For now, use deterministic values that reflect current capacity
      const currentAvailable = totalAvailableHours / 6; // Monthly average
      const currentAssigned = totalAssignedHours / 6; // Monthly average  
      const currentBillable = totalBillableHours / 6; // Monthly average
      
      return {
        month,
        available: currentAvailable,
        assigned: currentAssigned,
        billable: currentBillable,
      };
    });
  };

  const monthlyTrend = generateMonthlyTrend();

  // Capacity status
  const getCapacityStatus = () => {
    if (overloadRisk) {
      return {
        status: "Critical",
        color: "text-red-600",
        bgColor: "bg-red-100 dark:bg-red-900/30",
        borderColor: "border-red-200 dark:border-red-800",
        message: "Capacity exceeded - immediate action required",
        icon: AlertTriangle,
      };
    } else if (capacityBuffer < 100) {
      return {
        status: "Warning",
        color: "text-amber-600",
        bgColor: "bg-amber-100 dark:bg-amber-900/30",
        borderColor: "border-amber-200 dark:border-amber-800",
        message: "Limited capacity - monitor closely",
        icon: Clock,
      };
    } else {
      return {
        status: "Healthy",
        color: "text-green-600",
        bgColor: "bg-green-100 dark:bg-green-900/30",
        borderColor: "border-green-200 dark:border-green-800",
        message: "Adequate capacity available",
        icon: Activity,
      };
    }
  };

  const capacityStatus = getCapacityStatus();
  const StatusIcon = capacityStatus.icon;

  // Calculate efficiency metrics
  const efficiencyRate = totalAssignedHours > 0 ? (totalBillableHours / totalAssignedHours) * 100 : 0;
  const projectedOverload = monthlyTrend[monthlyTrend.length - 1].assigned > monthlyTrend[monthlyTrend.length - 1].available;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Capacity vs Load Analysis</h3>
          <p className="text-sm text-muted-foreground">
            Monitor team capacity against current and projected workload
          </p>
        </div>
        <div className={`px-3 py-1 rounded-full ${capacityStatus.bgColor}`}>
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-3 w-3 ${capacityStatus.color}`} />
            <span className={`text-sm font-medium ${capacityStatus.color}`}>
              {capacityStatus.status}
            </span>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className={`p-4 ${capacityStatus.borderColor}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Available Hours</span>
            </div>
            <span className="text-2xl font-bold">{totalAvailableHours.toFixed(0)}</span>
          </div>
          <p className="text-xs text-muted-foreground">Monthly capacity</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Assigned Hours</span>
            </div>
            <span className="text-2xl font-bold">{totalAssignedHours.toFixed(0)}</span>
          </div>
          <p className="text-xs text-muted-foreground">Current workload</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Billable Hours</span>
            </div>
            <span className="text-2xl font-bold">{totalBillableHours.toFixed(0)}</span>
          </div>
          <p className="text-xs text-muted-foreground">Actual hours worked</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Utilization Rate</span>
            </div>
            <span className={`text-2xl font-bold ${capacityStatus.color}`}>
              {utilizationRate.toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Team utilization</p>
        </Card>
      </div>

      {/* Capacity Trend Chart */}
      <Card className="p-6">
        <h4 className="text-sm font-semibold mb-4">6-Month Capacity Trend</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 10 }}
              />
              <YAxis 
                tick={{ fontSize: 10 }}
                tickFormatter={(value) => `${value}h`}
              />
              <Tooltip 
                formatter={(value, name) => [
                  `${(value as number).toFixed(0)}h`, 
                  name === 'available' ? 'Available' : name === 'assigned' ? 'Assigned' : 'Billable'
                ]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="available"
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3 }}
                name="Available"
              />
              <Line
                type="monotone"
                dataKey="assigned"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Assigned"
              />
              <Line
                type="monotone"
                dataKey="billable"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Billable"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
              <span>Assigned</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Billable</span>
            </div>
          </div>
          
          {projectedOverload && (
            <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
              Projected Overload
            </Badge>
          )}
        </div>
      </Card>

      {/* Capacity Analysis */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h4 className="text-sm font-semibold mb-4">Current Capacity Analysis</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Capacity Buffer</span>
              <div className="text-right">
                <span className={`text-lg font-bold ${capacityBuffer < 0 ? 'text-red-600' : capacityBuffer < 100 ? 'text-amber-600' : 'text-green-600'}`}>
                  {capacityBuffer > 0 ? '+' : ''}{capacityBuffer.toFixed(0)}h
                </span>
                <p className="text-xs text-muted-foreground">
                  {capacityBuffer < 0 ? 'Over capacity' : capacityBuffer < 100 ? 'Low buffer' : 'Good buffer'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Efficiency Rate</span>
              <div className="text-right">
                <span className={`text-lg font-bold ${efficiencyRate < 70 ? 'text-red-600' : efficiencyRate < 85 ? 'text-amber-600' : 'text-green-600'}`}>
                  {efficiencyRate.toFixed(1)}%
                </span>
                <p className="text-xs text-muted-foreground">
                  {efficiencyRate < 70 ? 'Low efficiency' : efficiencyRate < 85 ? 'Good efficiency' : 'High efficiency'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Overloaded Paralegals</span>
              <div className="text-right">
                <span className={`text-lg font-bold ${overloadedParalegals > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {overloadedParalegals}
                </span>
                <p className="text-xs text-muted-foreground">
                  {overloadedParalegals > 0 ? 'Need attention' : 'All healthy'}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h4 className="text-sm font-semibold mb-4">Recommendations</h4>
          <div className="space-y-3">
            {overloadRisk && (
              <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-400">
                    Reduce Workload Immediately
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-500 mt-1">
                    Consider redistributing matters or hiring additional staff
                  </p>
                </div>
              </div>
            )}
            
            {capacityBuffer < 100 && !overloadRisk && (
              <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <Clock className="h-4 w-4 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                    Monitor Capacity Closely
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-500 mt-1">
                    Limited buffer for new assignments
                  </p>
                </div>
              </div>
            )}
            
            {capacityBuffer >= 100 && !overloadRisk && (
              <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <Activity className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-400">
                    Optimal Capacity
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-500 mt-1">
                    Ready for new assignments
                  </p>
                </div>
              </div>
            )}

            {efficiencyRate < 70 && (
              <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-400">
                    Improve Efficiency
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-500 mt-1">
                    Focus on reducing non-billable time
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

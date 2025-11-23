import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Ward } from "@/lib/types"

interface WardCardProps {
  ward: Ward
}

export function WardCard({ ward }: WardCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ward {ward.ward_number}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Voters:</span>
          <span className="font-semibold">{ward.total_voters}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Booths:</span>
          <span className="font-semibold">{ward.booths}</span>
        </div>
      </CardContent>
    </Card>
  )
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Voter } from "@/lib/types"
import { AlertCircle } from "lucide-react"

interface ProfileCardProps {
  voter: Voter
}

export function ProfileCard({ voter }: ProfileCardProps) {
  const missingFields = []
  if (!voter.phone) missingFields.push("Phone")
  if (!voter.alternate_phone) missingFields.push("Alternate Phone")
  if (!voter.latitude || !voter.longitude) missingFields.push("Location")

  return (
    <Card>
      <CardHeader>
        <CardTitle>{voter.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Sec ID</p>
            <p className="font-semibold">{voter.sec_id}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Age</p>
            <p className="font-semibold">{voter.age}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Gender</p>
            <p className="font-semibold">{voter.gender}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Ward</p>
            <p className="font-semibold">{voter.ward_number}</p>
          </div>
        </div>

        {missingFields.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 flex gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Missing Fields</p>
              <p className="text-sm text-yellow-700">{missingFields.join(", ")}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

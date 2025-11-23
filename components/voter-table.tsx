"use client"

import Link from "next/link"
import type { Voter } from "@/lib/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"

interface VoterTableProps {
  voters: Voter[]
  onRowClick?: (voter: Voter) => void
}

export function VoterTable({ voters, onRowClick }: VoterTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Guardian</TableHead>
          <TableHead>Sec ID</TableHead>
          <TableHead>Age</TableHead>
          <TableHead>House No</TableHead>
          <TableHead>House Name</TableHead>
          <TableHead>Ward</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {voters.map((voter) => (
          <TableRow
            key={voter._id}
            className="cursor-pointer hover:bg-accent"
            onClick={() => onRowClick?.(voter)}
          >
            <TableCell className="font-medium">{voter.name}</TableCell>
            <TableCell>{voter.guardian_name || "-"}</TableCell>
            <TableCell>{voter.sec_id}</TableCell>
            <TableCell>{voter.age}</TableCell>
            <TableCell>{voter.house_no}</TableCell>
            <TableCell>{voter.house_name}</TableCell>
            <TableCell>{voter.ward_number}</TableCell>
            <TableCell>{voter.phone || "-"}</TableCell>
            <TableCell>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/voter/${voter.sec_id}`}>View</Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

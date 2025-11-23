// Revised Voter Search UI with English/Malayalam toggle and dual layout
// PC: English on left, Malayalam on right
// Mobile: Toggle button inside each card

"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

// ----------------------
// VOTER TYPE DEFINITION
// ----------------------
interface Voter {
  "Sl No": string;
  "House No": string;
  "Name Malayalam": string;
  "Name English": string;
  "Relation Guardian": string;
  "Relationship": string;
  "House Name Malayalam": string;
  "House Name English": string;
  "ID Card No": string;
  Sex: string;
  [key: string]: any; // fallback for extra keys
}

const safe = (v: any) => (v ? v.toString().toLowerCase() : "");

export default function VoterSearchDual() {
  const [data, setData] = useState<Voter[]>([]);
  const [showMalayalam, setShowMalayalam] = useState(false);

  const [nameQuery, setNameQuery] = useState("");
  const [idQuery, setIdQuery] = useState("");
  const [guardianQuery, setGuardianQuery] = useState("");
  const [filterSex, setFilterSex] = useState("all");
  const [filterHouse, setFilterHouse] = useState("");

  const [page, setPage] = useState(1);
  const pageSize = 20;

  // ----------------------
  // LOAD JSON DATA
  // ----------------------
  useEffect(() => {
    fetch("/2002-70-113.json")
      .then((res) => res.json())
      .then((json: Voter[]) => setData(json));
  }, []);

  // ----------------------
  // FILTER LOGIC
  // ----------------------
  const filtered = useMemo(() => {
    return data.filter((v: Voter) => {
      const nameMatch = safe(v["Name English"]).includes(
        nameQuery.toLowerCase()
      );

      const idMatch = safe(v["ID Card No"]).includes(idQuery.toLowerCase());

      const guardianMatch = safe(v["Relation Guardian"]).includes(
        guardianQuery.toLowerCase()
      );

      const houseMatch =
        !filterHouse || safe(v["House No"]).includes(filterHouse.toLowerCase());

      const sexMatch = filterSex === "all" || v.Sex === filterSex;

      return nameMatch && idMatch && guardianMatch && houseMatch && sexMatch;
    });
  }, [data, nameQuery, idQuery, guardianQuery, filterSex, filterHouse]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  // ----------------------
  // UI
  // ----------------------
  return (
    <div className="p-3 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-3 text-center">Voter Search</h1>

      {/* Toggle Button */}
      <div className="flex justify-end mb-3">
        <Button size="sm" onClick={() => setShowMalayalam(!showMalayalam)}>
          {showMalayalam ? "Show English" : "Show Malayalam"}
        </Button>
      </div>

      {/* Search Inputs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-4">

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Name</label>
          <Input
            value={nameQuery}
            placeholder="Search Name"
            onChange={(e) => {
              setNameQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">ID Card No</label>
          <Input
            value={idQuery}
            placeholder="Search ID"
            onChange={(e) => {
              setIdQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Guardian</label>
          <Input
            value={guardianQuery}
            placeholder="Search Guardian"
            onChange={(e) => {
              setGuardianQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Sex</label>
          <Select
            onValueChange={(v) => {
              setFilterSex(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Sex" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="M">Male</SelectItem>
              <SelectItem value="F">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">House No</label>
          <Input
            value={filterHouse}
            placeholder="House Number"
            onChange={(e) => {
              setFilterHouse(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Result Cards */}
      <div className="space-y-3">
        {paginated.map((v: Voter, i: number) => (
          <Card key={i} className="border rounded-xl shadow-sm">
            <CardContent className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3">

              {/* English Block */}
              <div className={`${showMalayalam ? "hidden md:block" : "block"}`}>
                <div className="font-semibold text-lg text-blue-900">
                  {v["Name English"]}
                </div>
                <div className="mt-1 text-sm"><b>ID:</b> {v["ID Card No"] || "Nil"}</div>
                <div className="text-sm"><b>Guardian:</b> {v["Relation Guardian"]}</div>
                <div className="text-sm"><b>Relation:</b> {v["Relationship"]}</div>
                <div className="text-sm mt-1">
                  <b>Address:</b> {v["House No"]} – {v["House Name English"]}
                </div>
              </div>

              {/* Malayalam Block */}
              <div className={`${showMalayalam ? "block" : "hidden md:block"}`}>
                <div className="font-semibold text-lg text-green-800 karthika-text">
                  {v["Name Malayalam"]}
                </div>
                <div className="mt-1 text-sm karthika-text">
                  <b>ID:</b> {v["ID Card No"] || "Nil"}
                </div>
                <div className="text-sm karthika-text">
                  <b>Guardian:</b> {v["Relation Guardian"]}
                </div>
                <div className="text-sm karthika-text">
                  <b>Relation:</b> {v["Relationship"]}
                </div>
                <div className="text-sm karthika-text mt-1">
                  <b>Address:</b> {v["House No"]} – {v["House Name Malayalam"]}
                </div>
              </div>

              {/* Footer */}
              <div className="text-xs text-gray-600 border-t pt-2 mt-2 grid grid-cols-3">
                <span><b>LAC:</b> 070</span>
                <span><b>Part:</b> 113</span>
                <span><b>Sl:</b> {v["Sl No"]}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-center items-center gap-4 my-5">
        <Button
          size="sm"
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          Prev
        </Button>

        <span className="text-base font-medium">Page {page}</span>

        <Button
          size="sm"
          disabled={page * pageSize >= filtered.length}
          onClick={() => setPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

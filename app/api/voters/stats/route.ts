import { NextRequest, NextResponse } from "next/server";
import { getVotersCollection } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const voters = await getVotersCollection();

    const district = req.nextUrl.searchParams.get("district");
    const lb = req.nextUrl.searchParams.get("lb");
    const ward = req.nextUrl.searchParams.get("ward");
    const booth = req.nextUrl.searchParams.get("booth");

    // Dynamic filters
    const filters: any = {};
    if (district) filters.district_code = district;
    if (lb) filters.lb_code = lb;
    if (ward) filters.ward_number = ward;
    if (booth) filters.booth_number = booth;

    // Execute single-pass aggregation pipeline for maximum speed on 3 Crore records
    const result = await voters
      .aggregate([
        { $match: filters },
        {
          $group: {
            _id: null,
            totalVoters: { $sum: 1 },
            activeCount: { $sum: { $cond: [{ $eq: ["$voter_status", "active"] }, 1, 0] } },
            maleCount: { $sum: { $cond: [{ $eq: ["$gender", "M"] }, 1, 0] } },
            femaleCount: { $sum: { $cond: [{ $eq: ["$gender", "F"] }, 1, 0] } },
            otherGenderCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ["$gender", "M"] },
                      { $ne: ["$gender", "F"] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            flaggedCount: { $sum: { $cond: [{ $eq: ["$is_flagged", true] }, 1, 0] } },
            phoneCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ["$phone", null] },
                      { $ne: ["$phone", ""] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            locationCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ["$latitude", null] },
                      { $ne: ["$longitude", null] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            totalAge: { $sum: { $cond: [{ $gt: ["$age", 0] }, "$age", 0] } },
            ageCount: { $sum: { $cond: [{ $gt: ["$age", 0] }, 1, 0] } },
            wards: { $addToSet: "$ward_number" },
            booths: { $addToSet: "$booth_number" },
            districts: { $addToSet: "$district_code" },
            lbs: { $addToSet: "$lb_code" },
          },
        },
      ])
      .toArray();

    const aggData = result[0] || {
      totalVoters: 0,
      activeCount: 0,
      maleCount: 0,
      femaleCount: 0,
      otherGenderCount: 0,
      flaggedCount: 0,
      phoneCount: 0,
      locationCount: 0,
      totalAge: 0,
      ageCount: 0,
      wards: [],
      booths: [],
      districts: [],
      lbs: [],
    };

    const totalVoters = aggData.totalVoters;
    const locationCount = aggData.locationCount;
    const avgAge = aggData.ageCount > 0 ? Number((aggData.totalAge / aggData.ageCount).toFixed(1)) : null;

    const stats = {
      filter_level: booth
        ? "booth"
        : ward
        ? "ward"
        : lb
        ? "local_body"
        : district
        ? "district"
        : "state",

      total_voters: totalVoters,
      total_wards: (aggData.wards || []).filter(Boolean).length,
      total_booths: (aggData.booths || []).filter(Boolean).length,
      districts_count: (aggData.districts || []).filter(Boolean).length,
      local_bodies_count: (aggData.lbs || []).filter(Boolean).length,

      active_voters: aggData.activeCount,
      male_count: aggData.maleCount,
      female_count: aggData.femaleCount,
      other_gender_count: aggData.otherGenderCount,

      flagged_voters: aggData.flaggedCount,
      with_phone: aggData.phoneCount,
      with_location: locationCount,
      missing_location: Math.max(0, totalVoters - locationCount),

      avg_age: avgAge,
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}

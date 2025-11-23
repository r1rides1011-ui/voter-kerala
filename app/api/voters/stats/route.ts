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

    // MongoDB statistics
    const [
      totalVoters,
      wards,
      booths,
      districts,
      lbs,
      activeCount,
      maleCount,
      femaleCount,
      otherGenderCount,
      flaggedCount,
      phoneCount,
      locationCount,
      avgAge
    ] = await Promise.all([
      voters.countDocuments(filters),
      voters.distinct("ward_number", filters),
      voters.distinct("booth_number", filters),
      voters.distinct("district_code", filters),
      voters.distinct("lb_code", filters),

      voters.countDocuments({ ...filters, voter_status: "active" }),
      voters.countDocuments({ ...filters, gender: "M" }),
      voters.countDocuments({ ...filters, gender: "F" }),
      voters.countDocuments({ ...filters, gender: { $nin: ["M", "F"] } }),

      voters.countDocuments({ ...filters, is_flagged: true }),
      voters.countDocuments({ ...filters, phone: { $ne: null } }),

      voters.countDocuments({
        ...filters,
        "location.coordinates.0": { $ne: null },
        "location.coordinates.1": { $ne: null },
      }),

      // AVG age using aggregation
      voters
        .aggregate([
          { $match: filters },
          { $group: { _id: null, avgAge: { $avg: "$age" } } },
        ])
        .toArray(),
    ]);

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
      total_wards: wards.length,
      total_booths: booths.length,
      districts_count: districts.length,
      local_bodies_count: lbs.length,

      active_voters: activeCount,
      male_count: maleCount,
      female_count: femaleCount,
      other_gender_count: otherGenderCount,

      flagged_voters: flaggedCount,
      with_phone: phoneCount,
      with_location: locationCount,
      missing_location: totalVoters - locationCount,

      avg_age:
        avgAge.length > 0 ? Number(avgAge[0].avgAge.toFixed(1)) : null,
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

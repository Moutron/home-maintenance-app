"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Home, MapPin, DollarSign, Building, TrendingUp, Calendar, Car, Waves, Flame, School, Footprints, Bus, Bike, ExternalLink, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

interface PropertySummaryCardProps {
  data: {
    yearBuilt?: number;
    squareFootage?: number;
    lotSize?: number;
    bedrooms?: number;
    bathrooms?: number;
    propertyType?: string;
    stories?: number;
    garageSpaces?: number;
    assessedValue?: number;
    marketValue?: number;
    taxAmount?: number;
    constructionType?: string;
    roofType?: string;
    foundationType?: string;
    heatingType?: string;
    coolingType?: string;
    latitude?: number;
    longitude?: number;
    county?: string;
    units?: number;
    parkingSpaces?: number;
    hasPool?: boolean;
    hasFireplace?: boolean;
    hasBasement?: boolean;
    basementType?: string;
    exteriorWallType?: string;
    interiorFeatures?: string[];
    exteriorFeatures?: string[];
    schoolDistrict?: string;
    elementarySchool?: string;
    middleSchool?: string;
    highSchool?: string;
    walkScore?: number;
    transitScore?: number;
    bikeScore?: number;
    propertyImageUrl?: string;
    zillowUrl?: string;
    redfinUrl?: string;
    sources?: string[];
  };
}

export function PropertySummaryCard({ data }: PropertySummaryCardProps) {
  const hasData = data.yearBuilt || data.squareFootage || data.bedrooms || data.marketValue;

  if (!hasData) {
    return null;
  }

  return (
    <Card className="border-green-200 bg-green-50/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Home className="h-5 w-5 text-green-600" />
            Property Summary
          </CardTitle>
          {data.sources && data.sources.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {data.sources.length} source{data.sources.length > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <CardDescription>
          Enriched property data from public records
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Property Image Preview */}
        {data.propertyImageUrl && (
          <div className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
            <Image
              src={data.propertyImageUrl}
              alt="Property"
              fill
              className="object-cover"
              onError={(e) => {
                // Hide image on error
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        )}

        {/* External Links */}
        {(data.zillowUrl || data.redfinUrl) && (
          <div className="flex gap-2 flex-wrap">
            {data.zillowUrl && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="text-xs"
              >
                <a href={data.zillowUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View on Zillow
                </a>
              </Button>
            )}
            {data.redfinUrl && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="text-xs"
              >
                <a href={data.redfinUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View on Redfin
                </a>
              </Button>
            )}
          </div>
        )}
        {/* Basic Property Info */}
        <div className="grid grid-cols-2 gap-4">
          {data.yearBuilt && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Year Built</p>
                <p className="font-semibold">{data.yearBuilt}</p>
              </div>
            </div>
          )}
          {data.propertyType && (
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Property Type</p>
                <p className="font-semibold capitalize">
                  {data.propertyType.replace(/-/g, " ")}
                </p>
              </div>
            </div>
          )}
          {data.squareFootage && (
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Square Footage</p>
                <p className="font-semibold">
                  {data.squareFootage.toLocaleString()} sq ft
                </p>
              </div>
            </div>
          )}
              {data.lotSize && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Lot Size</p>
                    <p className="font-semibold">{data.lotSize.toFixed(2)} acres</p>
                  </div>
                </div>
              )}
          {data.bedrooms && (
            <div>
              <p className="text-xs text-muted-foreground">Bedrooms</p>
              <p className="font-semibold">{data.bedrooms}</p>
            </div>
          )}
          {data.bathrooms && (
            <div>
              <p className="text-xs text-muted-foreground">Bathrooms</p>
              <p className="font-semibold">{data.bathrooms}</p>
            </div>
          )}
        </div>

        {/* Financial Information */}
        {(data.marketValue || data.assessedValue || data.taxAmount) && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Financial Information
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {data.marketValue && (
                <div>
                  <p className="text-xs text-muted-foreground">Market Value</p>
                  <p className="font-semibold text-green-700">
                    ${(data.marketValue / 1000).toFixed(0)}k
                  </p>
                </div>
              )}
              {data.assessedValue && (
                <div>
                  <p className="text-xs text-muted-foreground">Assessed Value</p>
                  <p className="font-semibold">
                    ${(data.assessedValue / 1000).toFixed(0)}k
                  </p>
                </div>
              )}
              {data.taxAmount && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Annual Tax</p>
                  <p className="font-semibold">${data.taxAmount.toLocaleString()}/year</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Building Characteristics */}
        {(data.constructionType || data.roofType || data.foundationType || data.heatingType || data.coolingType) && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Building className="h-4 w-4" />
              Building Characteristics
            </h4>
            <div className="space-y-2">
              {data.constructionType && (
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Construction:</span>
                  <span className="text-xs font-medium">{data.constructionType}</span>
                </div>
              )}
              {data.roofType && (
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Roof:</span>
                  <span className="text-xs font-medium">{data.roofType}</span>
                </div>
              )}
              {data.foundationType && (
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Foundation:</span>
                  <span className="text-xs font-medium">{data.foundationType}</span>
                </div>
              )}
              {data.heatingType && (
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Heating:</span>
                  <span className="text-xs font-medium">{data.heatingType}</span>
                </div>
              )}
              {data.coolingType && (
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Cooling:</span>
                  <span className="text-xs font-medium">{data.coolingType}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Property Features */}
        {(data.hasPool || data.hasFireplace || data.hasBasement || data.units || data.parkingSpaces) && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Building className="h-4 w-4" />
              Property Features
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {data.units && (
                <div className="flex items-center gap-2">
                  <Building className="h-3 w-3 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Units</p>
                    <p className="font-semibold text-sm">{data.units}</p>
                  </div>
                </div>
              )}
              {data.parkingSpaces && (
                <div className="flex items-center gap-2">
                  <Car className="h-3 w-3 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Parking Spaces</p>
                    <p className="font-semibold text-sm">{data.parkingSpaces}</p>
                  </div>
                </div>
              )}
              {data.hasPool && (
                <div className="flex items-center gap-2">
                  <Waves className="h-3 w-3 text-blue-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Pool</p>
                    <p className="font-semibold text-sm text-green-600">Yes</p>
                  </div>
                </div>
              )}
              {data.hasFireplace && (
                <div className="flex items-center gap-2">
                  <Flame className="h-3 w-3 text-orange-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Fireplace</p>
                    <p className="font-semibold text-sm text-green-600">Yes</p>
                  </div>
                </div>
              )}
              {data.hasBasement && (
                <div className="flex items-center gap-2">
                  <Building className="h-3 w-3 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Basement</p>
                    <p className="font-semibold text-sm">{data.basementType || "Yes"}</p>
                  </div>
                </div>
              )}
            </div>
            {(data.exteriorWallType || data.interiorFeatures?.length || data.exteriorFeatures?.length) && (
              <div className="mt-3 pt-3 border-t space-y-2">
                {data.exteriorWallType && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Exterior:</span>
                    <span className="font-medium">{data.exteriorWallType}</span>
                  </div>
                )}
                {data.interiorFeatures && data.interiorFeatures.length > 0 && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">Interior Features: </span>
                    <span className="font-medium">{data.interiorFeatures.slice(0, 3).join(", ")}</span>
                    {data.interiorFeatures.length > 3 && <span className="text-muted-foreground"> +{data.interiorFeatures.length - 3} more</span>}
                  </div>
                )}
                {data.exteriorFeatures && data.exteriorFeatures.length > 0 && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">Exterior Features: </span>
                    <span className="font-medium">{data.exteriorFeatures.slice(0, 3).join(", ")}</span>
                    {data.exteriorFeatures.length > 3 && <span className="text-muted-foreground"> +{data.exteriorFeatures.length - 3} more</span>}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* School Information */}
        {(data.schoolDistrict || data.elementarySchool || data.middleSchool || data.highSchool) && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <School className="h-4 w-4" />
              School Information
            </h4>
            <div className="space-y-2 text-xs">
              {data.schoolDistrict && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">District:</span>
                  <span className="font-medium">{data.schoolDistrict}</span>
                </div>
              )}
              {data.elementarySchool && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Elementary:</span>
                  <span className="font-medium">{data.elementarySchool}</span>
                </div>
              )}
              {data.middleSchool && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Middle:</span>
                  <span className="font-medium">{data.middleSchool}</span>
                </div>
              )}
              {data.highSchool && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">High:</span>
                  <span className="font-medium">{data.highSchool}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Walkability Scores */}
        {(data.walkScore || data.transitScore || data.bikeScore) && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-semibold mb-3">Walkability Scores</h4>
            <div className="grid grid-cols-3 gap-3">
              {data.walkScore !== undefined && (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Footprints className="h-3 w-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Walk</p>
                  </div>
                  <p className="font-semibold text-lg">{data.walkScore}</p>
                </div>
              )}
              {data.transitScore !== undefined && (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Bus className="h-3 w-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Transit</p>
                  </div>
                  <p className="font-semibold text-lg">{data.transitScore}</p>
                </div>
              )}
              {data.bikeScore !== undefined && (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Bike className="h-3 w-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Bike</p>
                  </div>
                  <p className="font-semibold text-lg">{data.bikeScore}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Additional Details */}
        {(data.stories || data.garageSpaces || data.county) && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-semibold mb-3">Additional Details</h4>
            <div className="grid grid-cols-2 gap-4">
              {data.stories && (
                <div>
                  <p className="text-xs text-muted-foreground">Stories</p>
                  <p className="font-semibold">{data.stories}</p>
                </div>
              )}
              {data.garageSpaces && (
                <div>
                  <p className="text-xs text-muted-foreground">Garage Spaces</p>
                  <p className="font-semibold">{data.garageSpaces}</p>
                </div>
              )}
              {data.county && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">County</p>
                  <p className="font-semibold">{data.county}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


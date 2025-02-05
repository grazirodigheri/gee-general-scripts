// Script to calculate the area of the land distribution and cut to a region of interest

// Biome boundaries
var shape_region = ee.FeatureCollection('projects/ee-grodigheri/assets/Shapes/RS_state')
// Map.addLayer(shape_region, {}, 'shp');

var region_name = "RS"

// Land distribution Image
var landDistribution = ee.Image('projects/ee-grazielirodigheri/assets/br_malhafundiaria_raster_final')
  .clip(shape_region)

// Renames the property to ID
var territory = landDistribution.rename(['ID']);
print("Territory", territory)
Map.addLayer(territory, {min: 1, max:10200, palette: ['cyan', 'blue', 'green', 'orange', 'brown']}, 'L. Distribution');

// Change the scale if you need.
var scale = 30;

// Image area in ha (divide by 1000000 to retrieve in km²)
var pixelArea = ee.Image.pixelArea().divide(10000);

// Convert to table and set are and ID to each feature
var convert2table = function (idGroup) {
  idGroup = ee.Dictionary(idGroup);
  var ID = idGroup.get('ID');
  var area = idGroup.get('sum');

  return ee.Feature(null)
    .set('ID', ID)
    .set('area', area);
};

// Calculate area
var calculateArea = function (territory, geometry) {
    var reducer = ee.Reducer.sum().group(1, 'ID');

    // Calculate the area of each class
    var territoriesData = pixelArea.addBands(territory)
        .reduceRegion({
            reducer: reducer,
            geometry: geometry,
            scale: scale,
            maxPixels: 1e13
        });

    // Extract groups
    var groups = ee.List(territoriesData.get('groups'));

    // Convert to table using the adjusted function
    var areas = groups.map(convert2table);

    // Combines all FeatureCollections into a single FeatureCollection
    return ee.FeatureCollection(areas)
};

// Use the function
var areas = calculateArea(territory, shape_region.geometry());
print("Areas", areas.limit(2))

// Define the Google Drive output folder 
var driverFolder = 'GEE_EXPORTS';

// Export table to drive
Export.table.toDrive({
    collection: areas,
    description: 'land_distribution_areas_'+region_name,
    folder: driverFolder,
    fileNamePrefix: 'land_distribution_areas_'+region_name,
    fileFormat: 'CSV'
});

// Export clipped tiff to drive
Export.image.toDrive({
  image: territory,               
  folder: driverFolder,
  description: 'tiff_distribution_areas_'+region_name,
  fileNamePrefix: 'tiff_distribution_areas_'+region_name,
  region: shape_region,
  scale: 30, 
  crs: 'EPSG:4326',
  maxPixels: 1e13,
  fileFormat: 'GeoTIFF',
  formatOptions: {
    cloudOptimized: true
  }
});
 
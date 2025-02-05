// Script para gerar shp da malha fundiária para uma região e área de cada classe

// Limite do biomas
var shape_regiao = ee.FeatureCollection('projects/ee-grodigheri/assets/Shapes/RS_state')
// Map.addLayer(shape_regiao, {}, 'shp');

var regiao_name = "RS"

// Imagem da malha fundiaria
var m_fund = ee.Image('projects/ee-grazielirodigheri/assets/br_malhafundiaria_raster_final')
  .clip(shape_regiao)

// Renomeia a propriedade para ID
var territory = m_fund.rename(['ID']);
print("Territory", territory)
Map.addLayer(territory, {min: 1, max:10200, palette: ['cyan', 'blue', 'green', 'orange', 'brown']}, 'M. Fund');

// Change the scale if you need.
var scale = 30;

// Image area in km2
var pixelArea = ee.Image.pixelArea().divide(10000);

var convert2table = function (idGroup) {
  idGroup = ee.Dictionary(idGroup);
  var ID = idGroup.get('ID');
  var area = idGroup.get('sum');

  return ee.Feature(null)
    .set('ID', ID)
    .set('area', area);
};

var calculateArea = function (territory, geometry) {
    var reducer = ee.Reducer.sum().group(1, 'ID');

    // Calcula área cruzando classes da imagem de classificação e territórios
    var territoriesData = pixelArea.addBands(territory)
        .reduceRegion({
            reducer: reducer,
            geometry: geometry,
            scale: scale,
            maxPixels: 1e13
        });

    // Extrai grupos
    var groups = ee.List(territoriesData.get('groups'));

    // Converte para tabela utilizando a função ajustada
    var areas = groups.map(convert2table);

    // Concatena todas as FeatureCollections em uma única FeatureCollection
    return ee.FeatureCollection(areas)
};

var areas = calculateArea(territory, shape_regiao.geometry());
print("Areas", areas.limit(2))

// Define a Google Drive output folder 
var driverFolder = 'Malha_fundiaria';

// Exporta tabela
Export.table.toDrive({
    collection: areas,
    description: 'areas_malha_fundiaria_'+regiao_name,
    folder: driverFolder,
    fileNamePrefix: 'areas_malha_fundiaria_'+regiao_name,
    fileFormat: 'CSV'
});

Export.image.toDrive({
  image: territory,                 // A imagem a ser exportada
  folder: driverFolder,
  description: 'image_malha_fundiaria_'+regiao_name,       // Nome do arquivo de exportação
  fileNamePrefix: 'image_malha_fundiaria_'+regiao_name,    // Prefixo do nome do arquivo
  region: shape_regiao,           // Região a ser exportada
  scale: 30,                       // Escala em metros por pixel
  crs: 'EPSG:4326',                // Sistema de referência de coordenadas (CRS)
  maxPixels: 1e13,
  fileFormat: 'GeoTIFF',           // Formato do arquivo de exportação
  formatOptions: {
    cloudOptimized: true          // Exportar como TIFF otimizado para nuvem (opcional)
  }
});
 
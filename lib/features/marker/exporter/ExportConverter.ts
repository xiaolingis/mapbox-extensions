import tokml from '@maphubs/tokml';
import {
    Colors,
    DxfWriter,
    HatchBoundaryPaths,
    HatchPolylineBoundary,
    HatchPredefinedPatterns,
    LWPolylineVertex,
    TrueColor,
    pattern,
    vec2_t,
    vec3_t,
    vertex
} from '@tarikjabiri/dxf';
import { array, date } from 'wheater';
import centroid from '@turf/centroid';

import { ExportGeoJsonType, MarkerFeatrueProperties } from '../types';
import { TCoordConvertOptions, coordConverter } from '../../../common/proj';
import { lang } from '../../../common/lang';


export type FileType = 'dxf' | 'kml' | 'geojson' | 'csv';

export type ConverterOptions = {
    coordConvertOptions?: TCoordConvertOptions
}

export interface IExportConverter {
    readonly type: FileType;
    convert(geojson: ExportGeoJsonType, options?: ConverterOptions): string;
}

export class DxfConverter implements IExportConverter {
    readonly type = 'dxf';
    private readonly style_name_text = "style_name_text";

    convert(geojson: ExportGeoJsonType, options?: ConverterOptions): string {
        const dxf = new DxfWriter();
        dxf.addLayer(lang.nameText, Colors.White);
        dxf.addLayer(lang.point, Colors.White);
        dxf.addLayer(lang.line, Colors.White);
        dxf.addLayer(lang.polygon, Colors.White);

        const style_text = dxf.document.tables.addStyle(this.style_name_text);
        style_text.fontFileName = "黑体";

        const coordConvertOptions = options?.coordConvertOptions ?? {
            type: "cgcs2000_gauss_kruger",
            lon_0: 120,
            x_0: 500000,
        }

        const featrues = geojson.type === "Feature" ? [geojson] : geojson.features;
        featrues.forEach(f => {
            const props = f.properties;
            switch (f.geometry.type) {
                case "Point":
                    this.circle(dxf, f.geometry.coordinates, props, coordConvertOptions);
                    break;
                case "MultiPoint":
                    f.geometry.coordinates.forEach(x => {
                        this.circle(dxf, x, props, coordConvertOptions);
                    })
                    break;

                case "LineString":
                    this.polyline(dxf, f.geometry.coordinates, props, coordConvertOptions);
                    break;

                case "MultiLineString":
                    f.geometry.coordinates.forEach(x => {
                        this.polyline(dxf, x, props, coordConvertOptions);
                    });
                    break;

                case "Polygon":
                    this.polygon(dxf, f.geometry.coordinates, props, coordConvertOptions);
                    break;

                case "MultiPolygon":
                    f.geometry.coordinates.forEach(x => {
                        this.polygon(dxf, x, props, coordConvertOptions);
                    });
                    break;
            }
        });

        return dxf.stringify();
    }

    private text(dxf: DxfWriter, position: GeoJSON.Position | vec3_t, options: MarkerFeatrueProperties, coordConvertOptions: TCoordConvertOptions) {
        if (position instanceof Array) {
            const point = coordConverter.convert(position, coordConvertOptions);
            position = { x: point[0], y: point[1], z: 0 };
        }

        const text = dxf.addText(position, (options.style.textSize ?? 10), options.name, {
            layerName: lang.nameText,
            trueColor: TrueColor.fromHex(options.style.textColor!).toString(),
        });

        text.textStyle = this.style_name_text;
    }

    private circle(dxf: DxfWriter, position: GeoJSON.Position | vec2_t, options: MarkerFeatrueProperties, coordConvertOptions: TCoordConvertOptions, withText: boolean = true) {
        let vec: vec3_t;
        if ('x' in position) {
            vec = { ...position, z: 0 };
        } else {
            const point = coordConverter.convert(position, coordConvertOptions);
            vec = { x: point[0], y: point[1], z: 0 } as vec3_t;
        }

        dxf.addCircle(vec, 10, {
            layerName: lang.point,
            trueColor: TrueColor.fromHex(options.style.pointIconColor!).toString()
        });
        if (withText)
            this.text(dxf, vec, options, coordConvertOptions);
    }

    private polyline(dxf: DxfWriter, positions: Array<GeoJSON.Position | vec2_t>, options: MarkerFeatrueProperties, coordConvertOptions: TCoordConvertOptions, withText: boolean = true) {
        const points = positions.map(position => {
            if ('x' in position)
                return { point: position } as LWPolylineVertex;

            const point = coordConverter.convert(position, coordConvertOptions);
            return { point: { x: point[0], y: point[1] } } as LWPolylineVertex;
        });

        dxf.addLWPolyline(points, {
            layerName: lang.line,
            thickness: options.style.lineWidth,
            trueColor: TrueColor.fromHex(options.style.lineColor!).toString()
        });

        if (withText)
            this.text(dxf, { ...array.first(points)!.point, z: 0 }, options, coordConvertOptions);
    }

    private polygon(dxf: DxfWriter, positionsArray: GeoJSON.Position[][], options: MarkerFeatrueProperties, coordConvertOptions: TCoordConvertOptions, withText: boolean = true) {
        const solid = pattern({
            name: HatchPredefinedPatterns.SOLID,
        });

        const hatchBoundaryPaths = new HatchBoundaryPaths();
        positionsArray.forEach(positionis => {
            const boundary = new HatchPolylineBoundary(positionis.map(position => {
                const point = coordConverter.convert(position, coordConvertOptions);
                return vertex(point[0], point[1]);
            }));

            hatchBoundaryPaths.addPolylineBoundary(boundary);

            this.polyline(dxf, boundary.vertices, {
                ...options, style: {
                    lineWidth: options.style.polygonOutlineWidth,
                    lineColor: options.style.polygonOutlineColor
                }
            }, coordConvertOptions, false);
        });

        dxf.addHatch(hatchBoundaryPaths, solid, {
            layerName: lang.polygon,
            trueColor: TrueColor.fromHex(options.style.polygonColor!).toString()
        });

        if (withText)
            this.text(dxf, centroid({ type: 'Polygon', coordinates: positionsArray }).geometry.coordinates, options, coordConvertOptions);
    }
}

export class KmlConverter implements IExportConverter {
    readonly type = 'kml';
    convert(geojson: ExportGeoJsonType): string {
        return tokml(geojson);
    }
}

export class GeoJsonConverter implements IExportConverter {
    readonly type = 'geojson';
    convert(geojson: ExportGeoJsonType): string {
        return JSON.stringify(geojson);
    }
}

export class CSVConverter implements IExportConverter {
    type: FileType = "csv";

    convert(geojson: ExportGeoJsonType): string {
        const features = geojson.type === 'Feature' ? [geojson] : geojson.features;
        const header = `name,date,style,geometry-type,geometry`;

        return header + '\n' + features.map(f =>
            this.value2Cell(f.properties.name) + ',' +
            date.formatDate(new Date(f.properties.date), 'yyyy-MM-dd HH:mm:ss') + ',' +
            this.value2Cell(JSON.stringify(f.properties.style)) + ',' +
            f.geometry.type + ',' +
            this.value2Cell(JSON.stringify(f.geometry))).join('\n');
    }

    private value2Cell(value: string) {
        value = value.replace(/"/g, `""`);
        return value.indexOf(',') >= 0 ?
            `"${value}"` : value;
    }
}

export const export_converters = [new DxfConverter(), new GeoJsonConverter(), new KmlConverter(), new CSVConverter()];
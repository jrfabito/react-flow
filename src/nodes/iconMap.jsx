import s3Url                  from '../public/images/S3.svg';
import rdsUrl                 from '../public/images/RDS.svg';
import redshiftUrl            from '../public/images/Redshift.svg';
import kinesisUrl             from '../public/images/Kinesis.svg';
import kafkaUrl               from '../public/images/Kafka.svg';
import dynamodbUrl            from '../public/images/DynamoDB.svg';
import sqlUrl                 from '../public/images/SQL.svg';
import docdbUrl               from '../public/images/DocDB.svg';
import mongodbUrl             from '../public/images/Mongo.svg';
import applyMappingUrl        from '../public/images/Apply-mapping.svg';
import selectFieldsUrl        from '../public/images/Select-fields.svg';
import dropFieldsUrl          from '../public/images/Drop-fields.svg';
import renameFieldsUrl        from '../public/images/Rename-fields.svg';
import spigotUrl              from '../public/images/Spigot.svg';
import joinUrl                from '../public/images/Join.svg';
import unionUrl               from '../public/images/Union.svg';
import splitFieldsUrl         from '../public/images/Split.svg';
import selectFromCollectionUrl from '../public/images/Select-from-collection.svg';
import filterUrl              from '../public/images/Filter.svg';
import customTransformUrl     from '../public/images/Custom-transform.svg';
import genericTransformUrl    from '../public/images/Generic-transform.svg';
import glueDcUrl              from '../public/images/GlueDC.svg';

const icon = (src, alt) => () => <img src={src} width={34} height={34} alt={alt} />;

export const ICON_MAP = {
  // Sources
  s3:       icon(s3Url,                  'Amazon S3'),
  rds:      icon(rdsUrl,                 'Amazon RDS'),
  redshift: icon(redshiftUrl,            'Amazon Redshift'),
  kinesis:  icon(kinesisUrl,             'Amazon Kinesis'),
  kafka:    icon(kafkaUrl,               'Apache Kafka'),
  dynamodb: icon(dynamodbUrl,            'Amazon DynamoDB'),
  sql:      icon(sqlUrl,                 'SQL Server'),
  docdb:    icon(docdbUrl,               'Amazon DocumentDB'),
  mongodb:  icon(mongodbUrl,             'MongoDB'),

  // Transforms
  applyMapping:          icon(applyMappingUrl,         'Apply mapping'),
  selectFields:          icon(selectFieldsUrl,          'Select fields'),
  dropFields:            icon(dropFieldsUrl,            'Drop fields'),
  renameFields:          icon(renameFieldsUrl,          'Rename fields'),
  spigot:                icon(spigotUrl,                'Spigot'),
  join:                  icon(joinUrl,                  'Join'),
  union:                 icon(unionUrl,                 'Union'),
  splitFields:           icon(splitFieldsUrl,           'Split fields'),
  selectFromCollection:  icon(selectFromCollectionUrl,  'Select from collection'),
  filter:                icon(filterUrl,                'Filter'),
  customTransform:       icon(customTransformUrl,       'Custom transform'),
  sparkSql:              icon(genericTransformUrl,      'Spark SQL'),

  // Targets
  s3Target: icon(s3Url,    'Amazon S3'),
  glueDc:   icon(glueDcUrl, 'Glue Data Catalog'),
};

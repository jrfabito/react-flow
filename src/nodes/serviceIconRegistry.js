import s3Url                  from '../public/images/S3.svg';
import rdsUrl                 from '../public/images/RDS.svg';
import redshiftUrl            from '../public/images/Redshift.svg';
import kinesisUrl             from '../public/images/Kinesis.svg';
import kafkaUrl               from '../public/images/Kafka.svg';
import dynamodbUrl            from '../public/images/DynamoDB.svg';
import sqlUrl                 from '../public/images/SQL.svg';
import docdbUrl               from '../public/images/DocDB.svg';
import mongoUrl               from '../public/images/Mongo.svg';
import unionUrl               from '../public/images/Union.svg';
import applyMappingUrl        from '../public/images/Apply-mapping.svg';
import selectFieldsUrl        from '../public/images/Select-fields.svg';
import dropFieldsUrl          from '../public/images/Drop-fields.svg';
import renameFieldsUrl        from '../public/images/Rename-fields.svg';
import spigotUrl              from '../public/images/Spigot.svg';
import joinUrl                from '../public/images/Join.svg';
import splitFieldsUrl         from '../public/images/Split.svg';
import selectFromCollectionUrl from '../public/images/Select-from-collection.svg';
import filterUrl              from '../public/images/Filter.svg';
import customTransformUrl     from '../public/images/Custom-transform.svg';
import sparkSqlUrl            from '../public/images/Generic-transform.svg';
import glueDcUrl              from '../public/images/GlueDC.svg';

export const serviceIconRegistry = {
  s3:                   s3Url,
  rds:                  rdsUrl,
  redshift:             redshiftUrl,
  kinesis:              kinesisUrl,
  kafka:                kafkaUrl,
  dynamodb:             dynamodbUrl,
  sql:                  sqlUrl,
  docdb:                docdbUrl,
  mongodb:              mongoUrl,
  union:                unionUrl,
  applyMapping:         applyMappingUrl,
  selectFields:         selectFieldsUrl,
  dropFields:           dropFieldsUrl,
  renameFields:         renameFieldsUrl,
  spigot:               spigotUrl,
  join:                 joinUrl,
  splitFields:          splitFieldsUrl,
  selectFromCollection: selectFromCollectionUrl,
  filter:               filterUrl,
  customTransform:      customTransformUrl,
  sparkSql:             sparkSqlUrl,
  glueDc:               glueDcUrl,
};

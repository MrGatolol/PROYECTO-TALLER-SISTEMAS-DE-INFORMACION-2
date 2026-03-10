import { Table, Column, Model, DataType, PrimaryKey } from "sequelize-typescript";

@Table({ tableName: "USUARIO", timestamps: false })
export default class Usuario extends Model<Usuario> {
  @PrimaryKey
  @Column({ type: DataType.STRING(10), allowNull: false })
  rut_usuario!: string;

  // CORRECCIÓN PROFESORA: Separar nombres
  @Column({ type: DataType.STRING(50), allowNull: false })
  nombres!: string;

  @Column({ type: DataType.STRING(30), allowNull: false })
  apellido_paterno!: string;

  @Column({ type: DataType.STRING(30), allowNull: true })
  apellido_materno?: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  contrasena!: string;

  @Column({ type: DataType.TINYINT, allowNull: false })
  tipo_usuario!: number;

  @Column({ type: DataType.STRING(50), allowNull: true })
  email_usuario?: string;

  @Column({ type: DataType.STRING(15), allowNull: true })
  fono_usuario?: string;
}
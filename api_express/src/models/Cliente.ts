import { Table, Column, Model, DataType, PrimaryKey, HasMany } from "sequelize-typescript";
import Pedido from "./Pedido";

@Table({ tableName: "CLIENTE", timestamps: false })
export default class Cliente extends Model<Cliente> {
  @PrimaryKey
  @Column({ type: DataType.STRING(10), allowNull: false, field: "rut_cliente" })
  rut_cliente!: string;

  // CORRECCIÓN PROFESORA: Separar nombres para mejor ordenamiento
  @Column({ type: DataType.STRING(50), allowNull: false, field: "nombres" })
  nombres!: string;

  @Column({ type: DataType.STRING(30), allowNull: false, field: "apellido_paterno" })
  apellido_paterno!: string;

  @Column({ type: DataType.STRING(30), allowNull: true, field: "apellido_materno" })
  apellido_materno?: string;

  @Column({ type: DataType.STRING(100), allowNull: true, field: "direccion" })
  direccion?: string;

  @Column({ type: DataType.STRING(15), allowNull: true, field: "fono" })
  fono?: string;

  @Column({ type: DataType.STRING(50), allowNull: true, field: "email" })
  email?: string;

  @Column({ type: DataType.STRING(65), allowNull: true, field: "giro" })
  giro?: string;

  @Column({ type: DataType.TINYINT, allowNull: false, defaultValue: 0, field: "tipo_cliente" })
  tipo_cliente!: number;

  @Column({ type: DataType.STRING(65), allowNull: true, field: "razon_social" })
  razon_social?: string;

  @HasMany(() => Pedido, "rut_cliente")
  pedidos?: Pedido[];
}
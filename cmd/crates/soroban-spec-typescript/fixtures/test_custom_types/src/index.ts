import * as SorobanClient from 'soroban-client';
import { xdr } from 'soroban-client';
import { Buffer } from "buffer";
import { scValStrToJs, scValToJs, addressToScVal, u128ToScVal, i128ToScVal, strToScVal } from './convert.js';
import { invoke, InvokeArgs } from './invoke.js';


export * from './constants.js'
export * from './server.js'
export * from './invoke.js'

export type u32 = number;
export type i32 = number;
export type u64 = bigint;
export type i64 = bigint;
export type u128 = bigint;
export type i128 = bigint;
export type u256 = bigint;
export type i256 = bigint;
export type Address = string;
export type Option<T> = T | undefined;
export type Typepoint = bigint;
export type Duration = bigint;

/// Error interface containing the error message
export interface Error_ { message: string };

export interface Result<T, E = Error_> {
    unwrap(): T,
    unwrapErr(): E,
    isOk(): boolean,
    isErr(): boolean,
};

export class Ok<T> implements Result<T> {
    constructor(readonly value: T) { }
    unwrapErr(): Error_ {
        throw new Error('No error');
    }
    unwrap(): T {
        return this.value;
    }

    isOk(): boolean {
        return true;
    }

    isErr(): boolean {
        return !this.isOk()
    }
}

export class Err<T> implements Result<T> {
    constructor(readonly error: Error_) { }
    unwrapErr(): Error_ {
        return this.error;
    }
    unwrap(): never {
        throw new Error(this.error.message);
    }

    isOk(): boolean {
        return false;
    }

    isErr(): boolean {
        return !this.isOk()
    }
}

if (typeof window !== 'undefined') {
    //@ts-ignore Buffer exists
    window.Buffer = window.Buffer || Buffer;
}

const regex = /ContractError\((\d+)\)/;

function getError(err: string): Err<Error_> | undefined {
    const match = err.match(regex);
    if (!match) {
        return undefined;
    }
    if (Errors == undefined) {
        return undefined;
    }
    // @ts-ignore
    let i = parseInt(match[1], 10);
    if (i < Errors.length) {
        return new Err(Errors[i]!);
    }
    return undefined;
}

/**
 * This is from the rust doc above the struct Test
 */
export interface Test {
  a: u32;
  b: boolean;
  c: string;
}

function TestToXdr(test?: Test): xdr.ScVal {
    if (!test) {
        return xdr.ScVal.scvVoid();
    }
    let arr = [
        new xdr.ScMapEntry({key: ((i)=>xdr.ScVal.scvSymbol(i))("a"), val: ((i)=>xdr.ScVal.scvU32(i))(test["a"])}),
        new xdr.ScMapEntry({key: ((i)=>xdr.ScVal.scvSymbol(i))("b"), val: ((i)=>xdr.ScVal.scvBool(i))(test["b"])}),
        new xdr.ScMapEntry({key: ((i)=>xdr.ScVal.scvSymbol(i))("c"), val: ((i)=>xdr.ScVal.scvSymbol(i))(test["c"])})
        ];
    return xdr.ScVal.scvMap(arr);
}


function TestFromXdr(base64Xdr: string): Test {
    let scVal = strToScVal(base64Xdr);
    let obj: [string, any][] = scVal.map()!.map(e => [e.key().str() as string, e.val()]);
    let map = new Map<string, any>(obj);
    if (!obj) {
        throw new Error('Invalid XDR');
    }
    return {
        a: scValToJs(map.get("a")) as unknown as u32,
        b: scValToJs(map.get("b")) as unknown as boolean,
        c: scValToJs(map.get("c")) as unknown as string
    };
}

export type SimpleEnum = {tag: "First", values: void} | {tag: "Second", values: void} | {tag: "Third", values: void};

function SimpleEnumToXdr(simpleEnum?: SimpleEnum): xdr.ScVal {
    if (!simpleEnum) {
        return xdr.ScVal.scvVoid();
    }
    let res: xdr.ScVal[] = [];
    switch (simpleEnum.tag) {
        case "First":
            res.push(((i) => xdr.ScVal.scvSymbol(i))("First"));
            break;
    case "Second":
            res.push(((i) => xdr.ScVal.scvSymbol(i))("Second"));
            break;
    case "Third":
            res.push(((i) => xdr.ScVal.scvSymbol(i))("Third"));
            break;  
    }
    return xdr.ScVal.scvVec(res);
}

function SimpleEnumFromXdr(base64Xdr: string): SimpleEnum {
    type Tag = SimpleEnum["tag"];
    type Value = SimpleEnum["values"];
    let [tag, values] = strToScVal(base64Xdr).vec()!.map(scValToJs) as [Tag, Value];
    if (!tag) {
        throw new Error('Missing enum tag when decoding SimpleEnum from XDR');
    }
    return { tag, values } as SimpleEnum;
}

export enum RoyalCard {
  Jack = 11,
  Queen = 12,
  King = 13,
}

function RoyalCardFromXdr(base64Xdr: string): RoyalCard {
    return  scValStrToJs(base64Xdr) as RoyalCard;
}


function RoyalCardToXdr(val: RoyalCard): xdr.ScVal {
    return  xdr.ScVal.scvI32(val);
}

export type TupleStruct = [Test,  SimpleEnum];

function TupleStructToXdr(tupleStruct?: TupleStruct): xdr.ScVal {
    if (!tupleStruct) {
        return xdr.ScVal.scvVoid();
    }
    let arr = [
        (i => TestToXdr(i))(tupleStruct[0]),
        (i => SimpleEnumToXdr(i))(tupleStruct[1])
        ];
    return xdr.ScVal.scvVec(arr);
}


function TupleStructFromXdr(base64Xdr: string): TupleStruct {
    return scValStrToJs(base64Xdr) as TupleStruct;
}

export type ComplexEnum = {tag: "Struct", values: [Test]} | {tag: "Tuple", values: [TupleStruct]} | {tag: "Enum", values: [SimpleEnum]} | {tag: "Void", values: void};

function ComplexEnumToXdr(complexEnum?: ComplexEnum): xdr.ScVal {
    if (!complexEnum) {
        return xdr.ScVal.scvVoid();
    }
    let res: xdr.ScVal[] = [];
    switch (complexEnum.tag) {
        case "Struct":
            res.push(((i) => xdr.ScVal.scvSymbol(i))("Struct"));
            res.push(((i)=>TestToXdr(i))(complexEnum.values[0]));
            break;
    case "Tuple":
            res.push(((i) => xdr.ScVal.scvSymbol(i))("Tuple"));
            res.push(((i)=>TupleStructToXdr(i))(complexEnum.values[0]));
            break;
    case "Enum":
            res.push(((i) => xdr.ScVal.scvSymbol(i))("Enum"));
            res.push(((i)=>SimpleEnumToXdr(i))(complexEnum.values[0]));
            break;
    case "Void":
            res.push(((i) => xdr.ScVal.scvSymbol(i))("Void"));
            break;  
    }
    return xdr.ScVal.scvVec(res);
}

function ComplexEnumFromXdr(base64Xdr: string): ComplexEnum {
    type Tag = ComplexEnum["tag"];
    type Value = ComplexEnum["values"];
    let [tag, values] = strToScVal(base64Xdr).vec()!.map(scValToJs) as [Tag, Value];
    if (!tag) {
        throw new Error('Missing enum tag when decoding ComplexEnum from XDR');
    }
    return { tag, values } as ComplexEnum;
}

const Errors = [ 
{message:"Unknown error has occured"}
]
export async function hello({hello}: {hello: string}, {signAndSend, fee}: {signAndSend?: boolean, fee?: number} = {signAndSend: false, fee: 100}): Promise<string> {
    let invokeArgs: InvokeArgs = {
        signAndSend,
        fee,
        method: 'hello', 
        args: [((i) => xdr.ScVal.scvSymbol(i))(hello)], 
    };
    
    // @ts-ignore Type does exist
    const response = await invoke(invokeArgs);
    return scValStrToJs(response.xdr) as string;
}

export async function woid( {signAndSend, fee}: {signAndSend?: boolean, fee?: number} = {signAndSend: false, fee: 100}): Promise<void> {
    let invokeArgs: InvokeArgs = {
        signAndSend,
        fee,
        method: 'woid', 
        
    };
    
    // @ts-ignore Type does exist
    const response = await invoke(invokeArgs);
    return ;
}

export async function val( {signAndSend, fee}: {signAndSend?: boolean, fee?: number} = {signAndSend: false, fee: 100}): Promise<any> {
    let invokeArgs: InvokeArgs = {
        signAndSend,
        fee,
        method: 'val', 
        
    };
    
    // @ts-ignore Type does exist
    const response = await invoke(invokeArgs);
    return scValStrToJs(response.xdr) as any;
}

export async function u32_fail_on_even({u32_}: {u32_: u32}, {signAndSend, fee}: {signAndSend?: boolean, fee?: number} = {signAndSend: false, fee: 100}): Promise<Result<u32>> {
    let invokeArgs: InvokeArgs = {
        signAndSend,
        fee,
        method: 'u32_fail_on_even', 
        args: [((i) => xdr.ScVal.scvU32(i))(u32_)], 
    };
    
    try {
        
    // @ts-ignore Type does exist
    const response = await invoke(invokeArgs);
    return new Ok(scValStrToJs(response.xdr) as u32);
    } catch (e) {
        //@ts-ignore
        let err = getError(e.message);
        if (err) {
            return err;
        } else {
            throw e;
        }
    }
}

export async function u32_({u32_}: {u32_: u32}, {signAndSend, fee}: {signAndSend?: boolean, fee?: number} = {signAndSend: false, fee: 100}): Promise<u32> {
    let invokeArgs: InvokeArgs = {
        signAndSend,
        fee,
        method: 'u32_', 
        args: [((i) => xdr.ScVal.scvU32(i))(u32_)], 
    };
    
    // @ts-ignore Type does exist
    const response = await invoke(invokeArgs);
    return scValStrToJs(response.xdr) as u32;
}

export async function i32_({i32_}: {i32_: i32}, {signAndSend, fee}: {signAndSend?: boolean, fee?: number} = {signAndSend: false, fee: 100}): Promise<i32> {
    let invokeArgs: InvokeArgs = {
        signAndSend,
        fee,
        method: 'i32_', 
        args: [((i) => xdr.ScVal.scvI32(i))(i32_)], 
    };
    
    // @ts-ignore Type does exist
    const response = await invoke(invokeArgs);
    return scValStrToJs(response.xdr) as i32;
}

export async function i64_({i64_}: {i64_: i64}, {signAndSend, fee}: {signAndSend?: boolean, fee?: number} = {signAndSend: false, fee: 100}): Promise<i64> {
    let invokeArgs: InvokeArgs = {
        signAndSend,
        fee,
        method: 'i64_', 
        args: [((i) => xdr.ScVal.scvI64(xdr.Int64.fromString(i.toString())))(i64_)], 
    };
    
    // @ts-ignore Type does exist
    const response = await invoke(invokeArgs);
    return scValStrToJs(response.xdr) as i64;
}

/**
 * Example contract method which takes a struct
 */
export async function strukt_hel({strukt}: {strukt: Test}, {signAndSend, fee}: {signAndSend?: boolean, fee?: number} = {signAndSend: false, fee: 100}): Promise<Array<string>> {
    let invokeArgs: InvokeArgs = {
        signAndSend,
        fee,
        method: 'strukt_hel', 
        args: [((i) => TestToXdr(i))(strukt)], 
    };
    
    // @ts-ignore Type does exist
    const response = await invoke(invokeArgs);
    return scValStrToJs(response.xdr) as Array<string>;
}

export async function strukt({strukt}: {strukt: Test}, {signAndSend, fee}: {signAndSend?: boolean, fee?: number} = {signAndSend: false, fee: 100}): Promise<Test> {
    let invokeArgs: InvokeArgs = {
        signAndSend,
        fee,
        method: 'strukt', 
        args: [((i) => TestToXdr(i))(strukt)], 
    };
    
    // @ts-ignore Type does exist
    const response = await invoke(invokeArgs);
    return TestFromXdr(response.xdr);
}

export async function simple({simple}: {simple: SimpleEnum}, {signAndSend, fee}: {signAndSend?: boolean, fee?: number} = {signAndSend: false, fee: 100}): Promise<SimpleEnum> {
    let invokeArgs: InvokeArgs = {
        signAndSend,
        fee,
        method: 'simple', 
        args: [((i) => SimpleEnumToXdr(i))(simple)], 
    };
    
    // @ts-ignore Type does exist
    const response = await invoke(invokeArgs);
    return SimpleEnumFromXdr(response.xdr);
}

export async function complex({complex}: {complex: ComplexEnum}, {signAndSend, fee}: {signAndSend?: boolean, fee?: number} = {signAndSend: false, fee: 100}): Promise<ComplexEnum> {
    let invokeArgs: InvokeArgs = {
        signAndSend,
        fee,
        method: 'complex', 
        args: [((i) => ComplexEnumToXdr(i))(complex)], 
    };
    
    // @ts-ignore Type does exist
    const response = await invoke(invokeArgs);
    return ComplexEnumFromXdr(response.xdr);
}

export async function addresse({addresse}: {addresse: Address}, {signAndSend, fee}: {signAndSend?: boolean, fee?: number} = {signAndSend: false, fee: 100}): Promise<Address> {
    let invokeArgs: InvokeArgs = {
        signAndSend,
        fee,
        method: 'addresse', 
        args: [((i) => addressToScVal(i))(addresse)], 
    };
    
    // @ts-ignore Type does exist
    const response = await invoke(invokeArgs);
    return scValStrToJs(response.xdr) as Address;
}

export async function bytes({bytes}: {bytes: Buffer}, {signAndSend, fee}: {signAndSend?: boolean, fee?: number} = {signAndSend: false, fee: 100}): Promise<Buffer> {
    let invokeArgs: InvokeArgs = {
        signAndSend,
        fee,
        method: 'bytes', 
        args: [((i) => xdr.ScVal.scvBytes(i))(bytes)], 
    };
    
    // @ts-ignore Type does exist
    const response = await invoke(invokeArgs);
    return scValStrToJs(response.xdr) as Buffer;
}

export async function bytes_n({bytes_n}: {bytes_n: Buffer}, {signAndSend, fee}: {signAndSend?: boolean, fee?: number} = {signAndSend: false, fee: 100}): Promise<Buffer> {
    let invokeArgs: InvokeArgs = {
        signAndSend,
        fee,
        method: 'bytes_n', 
        args: [((i) => xdr.ScVal.scvBytes(i))(bytes_n)], 
    };
    
    // @ts-ignore Type does exist
    const response = await invoke(invokeArgs);
    return scValStrToJs(response.xdr) as Buffer;
}

export async function card({card}: {card: RoyalCard}, {signAndSend, fee}: {signAndSend?: boolean, fee?: number} = {signAndSend: false, fee: 100}): Promise<RoyalCard> {
    let invokeArgs: InvokeArgs = {
        signAndSend,
        fee,
        method: 'card', 
        args: [((i) => RoyalCardToXdr(i))(card)], 
    };
    
    // @ts-ignore Type does exist
    const response = await invoke(invokeArgs);
    return RoyalCardFromXdr(response.xdr);
}

export async function boolean({boolean}: {boolean: boolean}, {signAndSend, fee}: {signAndSend?: boolean, fee?: number} = {signAndSend: false, fee: 100}): Promise<boolean> {
    let invokeArgs: InvokeArgs = {
        signAndSend,
        fee,
        method: 'boolean', 
        args: [((i) => xdr.ScVal.scvBool(i))(boolean)], 
    };
    
    // @ts-ignore Type does exist
    const response = await invoke(invokeArgs);
    return scValStrToJs(response.xdr) as boolean;
}

/**
 * Negates a boolean value
 */
export async function not({boolean}: {boolean: boolean}, {signAndSend, fee}: {signAndSend?: boolean, fee?: number} = {signAndSend: false, fee: 100}): Promise<boolean> {
    let invokeArgs: InvokeArgs = {
        signAndSend,
        fee,
        method: 'not', 
        args: [((i) => xdr.ScVal.scvBool(i))(boolean)], 
    };
    
    // @ts-ignore Type does exist
    const response = await invoke(invokeArgs);
    return scValStrToJs(response.xdr) as boolean;
}

export async function i128({i128}: {i128: i128}, {signAndSend, fee}: {signAndSend?: boolean, fee?: number} = {signAndSend: false, fee: 100}): Promise<i128> {
    let invokeArgs: InvokeArgs = {
        signAndSend,
        fee,
        method: 'i128', 
        args: [((i) => i128ToScVal(i))(i128)], 
    };
    
    // @ts-ignore Type does exist
    const response = await invoke(invokeArgs);
    return scValStrToJs(response.xdr) as i128;
}

export async function u128({u128}: {u128: u128}, {signAndSend, fee}: {signAndSend?: boolean, fee?: number} = {signAndSend: false, fee: 100}): Promise<u128> {
    let invokeArgs: InvokeArgs = {
        signAndSend,
        fee,
        method: 'u128', 
        args: [((i) => u128ToScVal(i))(u128)], 
    };
    
    // @ts-ignore Type does exist
    const response = await invoke(invokeArgs);
    return scValStrToJs(response.xdr) as u128;
}

export async function multi_args({a, b}: {a: u32, b: boolean}, {signAndSend, fee}: {signAndSend?: boolean, fee?: number} = {signAndSend: false, fee: 100}): Promise<u32> {
    let invokeArgs: InvokeArgs = {
        signAndSend,
        fee,
        method: 'multi_args', 
        args: [((i) => xdr.ScVal.scvU32(i))(a),
        ((i) => xdr.ScVal.scvBool(i))(b)], 
    };
    
    // @ts-ignore Type does exist
    const response = await invoke(invokeArgs);
    return scValStrToJs(response.xdr) as u32;
}

export async function map({map}: {map: Map<u32, boolean>}, {signAndSend, fee}: {signAndSend?: boolean, fee?: number} = {signAndSend: false, fee: 100}): Promise<Map<u32, boolean>> {
    let invokeArgs: InvokeArgs = {
        signAndSend,
        fee,
        method: 'map', 
        args: [((i) => xdr.ScVal.scvMap(Array.from(i.entries()).map(([key, value]) => {
            return new xdr.ScMapEntry({
                key: ((i)=>xdr.ScVal.scvU32(i))(key),
                val: ((i)=>xdr.ScVal.scvBool(i))(value)})
          })))(map)], 
    };
    
    // @ts-ignore Type does exist
    const response = await invoke(invokeArgs);
    return scValStrToJs(response.xdr) as Map<u32, boolean>;
}

export async function vec({vec}: {vec: Array<u32>}, {signAndSend, fee}: {signAndSend?: boolean, fee?: number} = {signAndSend: false, fee: 100}): Promise<Array<u32>> {
    let invokeArgs: InvokeArgs = {
        signAndSend,
        fee,
        method: 'vec', 
        args: [((i) => xdr.ScVal.scvVec(i.map((i)=>xdr.ScVal.scvU32(i))))(vec)], 
    };
    
    // @ts-ignore Type does exist
    const response = await invoke(invokeArgs);
    return scValStrToJs(response.xdr) as Array<u32>;
}

export async function tuple({tuple}: {tuple: [string, u32]}, {signAndSend, fee}: {signAndSend?: boolean, fee?: number} = {signAndSend: false, fee: 100}): Promise<[string, u32]> {
    let invokeArgs: InvokeArgs = {
        signAndSend,
        fee,
        method: 'tuple', 
        args: [((i) => xdr.ScVal.scvVec([((i) => xdr.ScVal.scvSymbol(i))(i[0]),
        ((i) => xdr.ScVal.scvU32(i))(i[1])]))(tuple)], 
    };
    
    // @ts-ignore Type does exist
    const response = await invoke(invokeArgs);
    return scValStrToJs(response.xdr) as [string, u32];
}

/**
 * Example of an optional argument
 */
export async function option({option}: {option: Option<u32>}, {signAndSend, fee}: {signAndSend?: boolean, fee?: number} = {signAndSend: false, fee: 100}): Promise<Option<u32>> {
    let invokeArgs: InvokeArgs = {
        signAndSend,
        fee,
        method: 'option', 
        args: [((i) => (!i) ? xdr.ScVal.scvVoid() : xdr.ScVal.scvU32(i))(option)], 
    };
    
    // @ts-ignore Type does exist
    const response = await invoke(invokeArgs);
    return scValStrToJs(response.xdr) as Option<u32>;
}

export async function u256({u256}: {u256: u256}, {signAndSend, fee}: {signAndSend?: boolean, fee?: number} = {signAndSend: false, fee: 100}): Promise<u256> {
    let invokeArgs: InvokeArgs = {
        signAndSend,
        fee,
        method: 'u256', 
        args: [((i) => i)(u256)], 
    };
    
    // @ts-ignore Type does exist
    const response = await invoke(invokeArgs);
    return scValStrToJs(response.xdr) as u256;
}

export async function i256({i256}: {i256: i256}, {signAndSend, fee}: {signAndSend?: boolean, fee?: number} = {signAndSend: false, fee: 100}): Promise<i256> {
    let invokeArgs: InvokeArgs = {
        signAndSend,
        fee,
        method: 'i256', 
        args: [((i) => i)(i256)], 
    };
    
    // @ts-ignore Type does exist
    const response = await invoke(invokeArgs);
    return scValStrToJs(response.xdr) as i256;
}

export async function string({string}: {string: string}, {signAndSend, fee}: {signAndSend?: boolean, fee?: number} = {signAndSend: false, fee: 100}): Promise<string> {
    let invokeArgs: InvokeArgs = {
        signAndSend,
        fee,
        method: 'string', 
        args: [((i) => xdr.ScVal.scvString(i))(string)], 
    };
    
    // @ts-ignore Type does exist
    const response = await invoke(invokeArgs);
    return scValStrToJs(response.xdr) as string;
}

export async function tuple_strukt({tuple_strukt}: {tuple_strukt: TupleStruct}, {signAndSend, fee}: {signAndSend?: boolean, fee?: number} = {signAndSend: false, fee: 100}): Promise<TupleStruct> {
    let invokeArgs: InvokeArgs = {
        signAndSend,
        fee,
        method: 'tuple_strukt', 
        args: [((i) => TupleStructToXdr(i))(tuple_strukt)], 
    };
    
    // @ts-ignore Type does exist
    const response = await invoke(invokeArgs);
    return TupleStructFromXdr(response.xdr);
}

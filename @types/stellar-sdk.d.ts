declare module '@stellar/stellar-sdk' {
    import * as StellarSdk from '@stellar/stellar-sdk';
    export = StellarSdk;
    export { Server } from '@stellar/stellar-sdk/lib/server';
    export { Horizon } from '@stellar/stellar-sdk/lib/horizon';  
    export type AccountResponse = StellarSdk.Horizon.AccountResponse; 

}

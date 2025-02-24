export interface ValidationError {
    detail: Array<{
        loc: string[];
        msg: string;
        type: string;
        usd_amount?: string;
        minimum_amount?: string;
        carbon_amount?: string;
    }>;
}

export interface QuoteResponse {
    usd_amount: number;
    carbon_amount: number;
}

export interface MinimumAmountError {
    error: 'MinimumAmountError';
    message: string;
    minimumAmount: number;
}

export interface SinkCarbonParams {
    funder: string;
    recipient?: string;
    carbonAmount?: number;
    usdcAmount?: number;
    paymentAsset?: string;
    vcsProjectId?: number;
}

export interface SinkCarbonResponse {
    xdr: string;
}

export interface StellarCarbonAPIError {
    error: string;
    details?: string | ValidationError;
}

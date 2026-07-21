#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, String,
    Symbol, Vec,
};

/// Storage layout. Instance storage is used throughout since a single
/// contract instance represents exactly one poll.
#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    Question,
    Options,
    Tally,
    Initialized,
    Voted(Address),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    InvalidOption = 3,
    AlreadyVoted = 4,
}

/// Topic for vote events: (VOTE_EVENT, voter) -> (option_index, new_count)
const VOTE_EVENT: Symbol = symbol_short!("vote");

#[contract]
pub struct PollContract;

#[contractimpl]
impl PollContract {
    /// One-time setup. Sets the admin, the poll question, and its options.
    /// Must be called once, right after deployment.
    pub fn initialize(
        env: Env,
        admin: Address,
        question: String,
        options: Vec<String>,
    ) -> Result<(), Error> {
        admin.require_auth();

        if env.storage().instance().has(&DataKey::Initialized) {
            return Err(Error::AlreadyInitialized);
        }

        let mut tally: Vec<u32> = Vec::new(&env);
        for _ in options.iter() {
            tally.push_back(0);
        }

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Question, &question);
        env.storage().instance().set(&DataKey::Options, &options);
        env.storage().instance().set(&DataKey::Tally, &tally);
        env.storage().instance().set(&DataKey::Initialized, &true);

        // Instance storage on a fresh poll contract should live for a while;
        // bump so it doesn't expire before the poll is used.
        env.storage().instance().extend_ttl(500_000, 500_000);

        Ok(())
    }

    /// Casts one vote for `option_index`. Requires the voter's signature.
    /// Each address may vote exactly once.
    pub fn vote(env: Env, voter: Address, option_index: u32) -> Result<u32, Error> {
        voter.require_auth();

        if !env.storage().instance().has(&DataKey::Initialized) {
            return Err(Error::NotInitialized);
        }

        let options: Vec<String> = env.storage().instance().get(&DataKey::Options).unwrap();
        if option_index >= options.len() {
            return Err(Error::InvalidOption);
        }

        let voted_key = DataKey::Voted(voter.clone());
        if env.storage().instance().has(&voted_key) {
            return Err(Error::AlreadyVoted);
        }

        let mut tally: Vec<u32> = env.storage().instance().get(&DataKey::Tally).unwrap();
        let new_count = tally.get(option_index).unwrap() + 1;
        tally.set(option_index, new_count);

        env.storage().instance().set(&DataKey::Tally, &tally);
        env.storage().instance().set(&voted_key, &option_index);

        // Emitted so the frontend can listen for votes and update the
        // results view in real time without polling on every render.
        env.events()
            .publish((VOTE_EVENT, voter), (option_index, new_count));

        Ok(new_count)
    }

    pub fn get_question(env: Env) -> Result<String, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Question)
            .ok_or(Error::NotInitialized)
    }

    pub fn get_options(env: Env) -> Result<Vec<String>, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Options)
            .ok_or(Error::NotInitialized)
    }

    /// Vote counts, in the same order as `get_options`.
    pub fn get_results(env: Env) -> Result<Vec<u32>, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Tally)
            .ok_or(Error::NotInitialized)
    }

    pub fn has_voted(env: Env, voter: Address) -> bool {
        env.storage().instance().has(&DataKey::Voted(voter))
    }
}

mod test;

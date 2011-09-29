#Reverse Proxy and Static File Server

##Design Goals
 * Functionally equivalent and backwards-compatible with Nginx
 * Strong focus on Performance, Stability and Security
 * Uses Nginx-compatible config files
 * Low-level, modular and extensible

This is a work in progress and is not feature-complete and largely un-tested. The goal is to reach alpha with a set of
core features in the near future and after sufficient testing begin battle-testing in a simple production environment.

##Additions / Enhancements to Nginx
 * Able to speak HTTP 1.1 to back-end server
 * Logfile cycling
 * Default behaviour: start proxy connection while still receiving request body (streaming/chunked proxy)
 * Optional: receive entire request body (cache to disk) before proxing
 * Built-in upload module with progress reporting
 * REST-ful API for re-loading config and getting real-time stats

##Even More Features (future modules)
 * In-memory resource caching (Memcached module)
   * Configurable for certain content-types, within file-size constraints
   * Prioritization based on rules and resource popularity
 * Real-time CSS/JS minification (using caching module)
 * Web-interface for administering / editing config (using REST API)

